import { json, ownerRequired, type Env } from "../_lib/env";
import { ensureCustomerTables } from "../_lib/customer-auth";
import { purgeExpiredCustomerOrders } from "../_lib/order-retention";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;

  const customerId = new URL(request.url).searchParams.get("customerId")?.trim();
  if (!customerId || customerId.length > 128) {
    return json({ error: "A valid customer account is required." }, 400, { "cache-control": "no-store" });
  }

  try {
    await ensureCustomerTables(env);
    await purgeExpiredCustomerOrders(env);
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
      id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
      note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, order_number INTEGER, customer_id TEXT
    )`).run();

    const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
    const names = new Set((columns.results || []).map((column: any) => String(column.name)));
    if (!names.has("customer_id")) {
      await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN customer_id TEXT").run();
    }
    if (!names.has("archived_at")) {
      await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN archived_at INTEGER").run();
    }

    const result = await env.DB.prepare(`
      SELECT id, order_number, items_json, total, status, created_at, updated_at, archived_at
      FROM customer_orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `).bind(customerId).all<any>();

    const orders = (result.results || []).map((row: any) => {
      let items: any[] = [];
      try {
        const parsed = JSON.parse(row.items_json || "[]");
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [];
      }
      return {
        id: String(row.id),
        orderNumber: Number(row.order_number || 0),
        items,
        total: Number(row.total || 0),
        status: String(row.status || "new"),
        createdAt: Number(row.created_at || 0),
        updatedAt: Number(row.updated_at || 0),
        archived: row.archived_at != null
      };
    });

    return json({ orders, total: orders.length }, 200, { "cache-control": "no-store" });
  } catch (error) {
    console.error("Owner customer order history failed", error);
    return json({ error: "Customer order history is temporarily unavailable." }, 503, { "cache-control": "no-store" });
  }
};
