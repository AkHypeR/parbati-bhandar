import { json, type Env } from "../_lib/env";
import { ensureCustomerTables, getCustomer } from "../_lib/customer-auth";

async function ensureCartTable(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_carts (
    customer_id TEXT PRIMARY KEY,
    cart_json TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
  )`).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to sync your cart." }, 401, { "cache-control": "no-store" });
  await ensureCartTable(env);
  const row = await env.DB.prepare("SELECT cart_json,updated_at FROM customer_carts WHERE customer_id=?")
    .bind(customer.id).first<any>();
  let cart: any = {};
  try {
    const parsed = row?.cart_json ? JSON.parse(row.cart_json) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) cart = parsed;
  } catch { /* Recover safely from an invalid legacy cart payload. */ }
  return json({ cart, updatedAt: Number(row?.updated_at || 0) }, 200, { "cache-control": "no-store" });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to sync your cart." }, 401, { "cache-control": "no-store" });
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid cart data." }, 400); }
  const incoming = body?.cart;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return json({ error: "Invalid cart data." }, 400);
  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(incoming).slice(0, 100)) {
    if (!value || typeof value !== "object") continue;
    const item: any = value;
    const product: any = item.product;
    const qty = Number(item.qty);
    if (!product || typeof product.id !== "string" || typeof product.name !== "string" ||
        !Number.isFinite(qty) || qty <= 0 || qty > 999) continue;
    safe[String(key).slice(0, 180)] = {
      cartKey: String(item.cartKey || key).slice(0, 180),
      product: { id: product.id.slice(0, 100), name: product.name.slice(0, 120), unit: String(product.unit || "1 unit").slice(0, 40), price: Math.max(0, Number(product.price) || 0), mrp: Number.isFinite(Number(product.mrp)) ? Number(product.mrp) : null, inStock: product.inStock !== false, lowStock: product.lowStock === true },
      selectedUnit: String(item.selectedUnit || product.unit || "1 unit").slice(0, 40),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      unitMrp: Number.isFinite(Number(item.unitMrp)) ? Number(item.unitMrp) : null,
      qty
    };
  }
  const serialized = JSON.stringify(safe);
  if (serialized.length > 100000) return json({ error: "Your cart is too large to sync. Remove a few items and try again." }, 413);
  await ensureCartTable(env);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO customer_carts(customer_id,cart_json,updated_at) VALUES(?,?,?)
    ON CONFLICT(customer_id) DO UPDATE SET cart_json=excluded.cart_json,updated_at=excluded.updated_at`)
    .bind(customer.id, serialized, now).run();
  return json({ ok: true, updatedAt: now }, 200, { "cache-control": "no-store" });
};
