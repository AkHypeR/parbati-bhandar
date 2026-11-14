import { json, type Env } from "../_lib/env";
import { ensureCustomerTables, getCustomer } from "../_lib/customer-auth";

async function ensureInboxTable(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_inbox_notifications (
    id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_customer_inbox_customer_created ON customer_inbox_notifications(customer_id,created_at DESC)").run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to view your notifications." }, 401, { "cache-control": "no-store" });
  await ensureInboxTable(env);
  const result = await env.DB.prepare("SELECT id,title,body,created_at AS createdAt,read_at AS readAt FROM customer_inbox_notifications WHERE customer_id=? ORDER BY created_at DESC LIMIT 50").bind(customer.id).all<any>();
  const notifications = result.results || [];
  return json({ notifications, unreadCount: notifications.filter((item: any) => !item.readAt).length }, 200, { "cache-control": "no-store" });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to manage your notifications." }, 401, { "cache-control": "no-store" });
  await ensureInboxTable(env);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid notification update." }, 400); }
  const now = Date.now();
  if (body?.markAllRead === true) {
    await env.DB.prepare("UPDATE customer_inbox_notifications SET read_at=? WHERE customer_id=? AND read_at IS NULL").bind(now, customer.id).run();
    return json({ ok: true }, 200, { "cache-control": "no-store" });
  }
  const id = String(body?.id || "").trim().slice(0, 100);
  if (!id) return json({ error: "Notification ID is required." }, 400);
  await env.DB.prepare("UPDATE customer_inbox_notifications SET read_at=? WHERE id=? AND customer_id=? AND read_at IS NULL").bind(now, id, customer.id).run();
  return json({ ok: true }, 200, { "cache-control": "no-store" });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to delete your notifications." }, 401, { "cache-control": "no-store" });
  await ensureInboxTable(env);
  let body: any = {};
  try { body = await request.json(); } catch { /* An empty body is treated as an invalid request. */ }
  if (body?.deleteAll === true) {
    await env.DB.prepare("DELETE FROM customer_inbox_notifications WHERE customer_id=?").bind(customer.id).run();
    return json({ ok: true, deletedAll: true }, 200, { "cache-control": "no-store" });
  }
  const id = String(body?.id || "").trim().slice(0, 100);
  if (!id) return json({ error: "Notification ID is required." }, 400);
  await env.DB.prepare("DELETE FROM customer_inbox_notifications WHERE id=? AND customer_id=?").bind(id, customer.id).run();
  return json({ ok: true }, 200, { "cache-control": "no-store" });
};
