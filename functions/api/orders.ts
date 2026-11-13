import { json, ownerRequired, type Env } from "../_lib/env";

type OrderItem = { name: string; quantity: number; unit: string; price: number };
const ensureTable = (env: Env) => env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
 id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
 note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'new',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
)`).run();

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await ensureTable(env);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid order." }, 400); }
  const name = String(body?.customerName || "").trim().slice(0, 100);
  const phone = String(body?.customerPhone || "").replace(/\D/g, "").slice(0, 15);
  const note = String(body?.note || "").trim().slice(0, 500);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 100).map((x: any) => ({
    name: String(x.name || "").slice(0, 120), quantity: Math.max(1, Math.min(999, Number(x.quantity) || 1)),
    unit: String(x.unit || "").slice(0, 30), price: Math.max(0, Number(x.price) || 0)
  })) : [];
  if (!name || phone.length < 10 || phone.length > 15 || !items.length || items.some((x: OrderItem) => !x.name)) return json({ error: "Please enter your name, valid phone number and at least one item." }, 400);
  const total = items.reduce((sum: number, x: OrderItem) => sum + x.price * x.quantity, 0);
  const id = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare("INSERT INTO customer_orders (id,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'new',?,?)")
    .bind(id,name,phone,note,JSON.stringify(items),total,now,now).run();
  return json({ ok: true, orderId: id }, 201, { "cache-control": "no-store" });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  // Retain pending orders; prune only completed/cancelled records older than 30 days.
  await env.DB.prepare("DELETE FROM customer_orders WHERE status IN ('completed','cancelled') AND updated_at < ?").bind(Date.now() - 30*86400000).run();
  const rows = await env.DB.prepare("SELECT id,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at FROM customer_orders ORDER BY created_at DESC LIMIT 100").all<any>();
  return json({ orders: (rows.results || []).map((r: any) => ({ id:r.id, customerName:r.customer_name, customerPhone:r.customer_phone, note:r.note, items:JSON.parse(r.items_json), total:r.total, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at })) }, 200, { "cache-control": "no-store" });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  let body: any; try { body = await request.json(); } catch { return json({error:"Invalid update."},400); }
  const status = String(body?.status || "");
  if (!["new","ready","unavailable","completed","cancelled"].includes(status) || !body?.id) return json({error:"Invalid order status."},400);
  const result = await env.DB.prepare("UPDATE customer_orders SET status=?, updated_at=? WHERE id=?").bind(status,Date.now(),String(body.id)).run();
  return json({ok:true,changes:result.meta.changes});
};