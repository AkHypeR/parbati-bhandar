import type { Env } from "./env";

/** Ensure the order tables exist before customer tracking is used. */
async function ensureOrderRetentionTables(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
    id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
    note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL, order_number INTEGER,
    stock_deducted INTEGER NOT NULL DEFAULT 0
  )`).run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS push_subscriptions (order_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_stock_deductions (order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL, PRIMARY KEY (order_id, product_id))").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_stock_deduction_guard (order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL, CHECK (expected_count = actual_count))").run();

  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_sequence (name TEXT PRIMARY KEY, value INTEGER NOT NULL)").run();
  const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
  const names = (columns.results || []).map((column: any) => column.name);
  if (!names.includes("order_number")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN order_number INTEGER").run();
  if (!names.includes("stock_deducted")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0").run();
  // Assign tracking numbers to legacy orders before customers request history.
  const unnumbered = await env.DB.prepare("SELECT id FROM customer_orders WHERE order_number IS NULL ORDER BY created_at ASC, id ASC").all<any>();
  let nextNumber = 1;
  for (const row of unnumbered.results || []) {
    await env.DB.prepare("UPDATE customer_orders SET order_number=? WHERE id=?").bind(nextNumber++, row.id).run();
  }
  const maximum = await env.DB.prepare("SELECT COALESCE(MAX(order_number),0) AS value FROM customer_orders").first<any>();
  await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',?) ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)").bind(Number(maximum?.value || 0)).run();
}

/** Delete customer orders and related records seven days after creation. */
export async function purgeExpiredCustomerOrders(env: Env): Promise<void> {
  await ensureOrderRetentionTables(env);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM push_subscriptions WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM order_stock_deductions WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM order_stock_deduction_guard WHERE order_id IN (SELECT id FROM customer_orders WHERE created_at < ?)").bind(cutoff),
    env.DB.prepare("DELETE FROM customer_orders WHERE created_at < ?").bind(cutoff),
  ]);
}
