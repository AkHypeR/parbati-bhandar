import { json, ownerRequired, type Env } from "../_lib/env";
import { ensureCustomerTables } from "../_lib/customer-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  try {
    await ensureCustomerTables(env);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
      id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
      note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, order_number INTEGER, customer_id TEXT
    )`).run();
    const orderColumns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
    const names = new Set((orderColumns.results || []).map((column: any) => String(column.name)));
    if (!names.has("customer_id")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN customer_id TEXT").run();
    if (!names.has("archived_at")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN archived_at INTEGER").run();
    const result = await env.DB.prepare(`
      SELECT a.id, a.name, a.phone, a.created_at AS createdAt, a.updated_at AS lastLoginAt,
        COUNT(o.id) AS orderCount,
        MAX(o.created_at) AS lastOrderAt,
        COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','unavailable') THEN o.total ELSE 0 END),0) AS totalOrderValue
      FROM customer_accounts a
      LEFT JOIN customer_orders o ON o.customer_id=a.id AND o.archived_at IS NULL
      GROUP BY a.id, a.name, a.phone, a.created_at, a.updated_at
      ORDER BY a.created_at DESC
    `).all<any>();
    return json({ customers: result.results || [], total: (result.results || []).length }, 200, { "cache-control": "no-store" });
  } catch (error) {
    console.error("Owner customer directory failed", error);
    return json({ error: "Customer details are temporarily unavailable." }, 503, { "cache-control": "no-store" });
  }
};
