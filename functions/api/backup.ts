import { json, ownerRequired, type Env } from "../_lib/env";

async function ensureOrders(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
    id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
    note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL, order_number INTEGER
  )`).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  await ensureOrders(env);
  const [products, settings, orders] = await Promise.all([
    env.DB.prepare("SELECT id, data, updated_at FROM products ORDER BY id").all<any>(),
    env.DB.prepare("SELECT data, updated_at FROM store_settings WHERE id=1").first<any>(),
    env.DB.prepare("SELECT id,order_number,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at FROM customer_orders ORDER BY order_number").all<any>(),
  ]);
  const snapshot = {
    format: "parbati-bhandar-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    products: (products.results || []).map((row: any) => {
      try { return JSON.parse(row.data); } catch { return null; }
    }).filter(Boolean),
    settings: (() => { try { return settings?.data ? JSON.parse(settings.data) : {}; } catch { return {}; } })(),
    orders: (orders.results || []).map((row: any) => ({
      id: row.id, orderNumber: row.order_number, customerName: row.customer_name,
      customerPhone: row.customer_phone, note: row.note,
      items: (() => { try { return JSON.parse(row.items_json); } catch { return []; } })(),
      total: row.total, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
    })),
  };
  return new Response(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="parbati-bhandar-backup-${new Date().toISOString().slice(0,10)}.json"`,
      "cache-control": "no-store",
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  let backup: any;
  try { backup = await request.json(); } catch { return json({ error: "Invalid backup file." }, 400); }
  if (backup?.format !== "parbati-bhandar-backup" || backup?.version !== 1 ||
      !Array.isArray(backup.products) || !Array.isArray(backup.orders) ||
      backup.products.length > 2000 || backup.orders.length > 10000 ||
      !backup.settings || typeof backup.settings !== "object" || Array.isArray(backup.settings)) {
    return json({ error: "Backup format is not valid or exceeds the allowed size." }, 400);
  }
  const validProducts = backup.products.every((p: any) =>
    p && typeof p.id === "string" && p.id.length <= 200 && typeof p.name === "string"
  );
  const validOrders = backup.orders.every((o: any) =>
    o && typeof o.id === "string" && typeof o.customerName === "string" &&
    typeof o.customerPhone === "string" && Array.isArray(o.items) &&
    ["new","ready","unavailable","completed","cancelled"].includes(o.status)
  );
  if (!validProducts || !validOrders) return json({ error: "Backup contains invalid product or order records." }, 400);

  await ensureOrders(env);
  const statements = [
    env.DB.prepare("DELETE FROM products"),
    env.DB.prepare("DELETE FROM customer_orders"),
    env.DB.prepare("INSERT INTO store_settings (id,data,updated_at) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at")
      .bind(JSON.stringify(backup.settings), Date.now()),
    ...backup.products.map((p: any) => env.DB.prepare(
      "INSERT INTO products (id,data,updated_at) VALUES (?,?,?)"
    ).bind(p.id, JSON.stringify(p), Number(p.updatedAt) || Date.now())),
    ...backup.orders.map((o: any) => env.DB.prepare(
      "INSERT INTO customer_orders (id,order_number,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).bind(o.id, Number(o.orderNumber) || null, o.customerName, o.customerPhone,
      String(o.note || "").slice(0,500), JSON.stringify(o.items), Math.max(0, Number(o.total) || 0),
      o.status, Number(o.createdAt) || Date.now(), Number(o.updatedAt) || Number(o.createdAt) || Date.now())),
  ];
  for (let i=0; i<statements.length; i+=80) await env.DB.batch(statements.slice(i,i+80));
  const maxOrder = backup.orders.reduce((max: number, o: any) => Math.max(max, Number(o.orderNumber) || 0), 0);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_sequence (name TEXT PRIMARY KEY, value INTEGER NOT NULL)").run();
  await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value")
    .bind(maxOrder).run();
  return json({ ok: true, productsRestored: backup.products.length, ordersRestored: backup.orders.length });
};
