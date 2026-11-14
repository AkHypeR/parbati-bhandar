import { json, ownerRequired, type Env } from "../_lib/env";
import { ensureCustomerTables } from "../_lib/customer-auth";
import { sendPushNotification } from "@mmmike/web-push/send";

async function ensureInboxTable(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_inbox_notifications (
    id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_customer_inbox_customer_created ON customer_inbox_notifications(customer_id,created_at DESC)").run();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  await ensureCustomerTables(env);
  await ensureInboxTable(env);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid notification message." }, 400); }
  const title = String(body?.title || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const message = String(body?.body || "").trim().slice(0, 400);
  if (title.length < 2 || message.length < 3) return json({ error: "Enter a title and a message before sending." }, 400);

  const customersResult = await env.DB.prepare("SELECT id FROM customer_accounts").all<any>();
  const customers = customersResult.results || [];
  if (!customers.length) return json({ ok: true, recipientCount: 0, pushSent: 0, pushFailed: 0, pushConfigured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) }, 200, { "cache-control": "no-store" });

  const now = Date.now();
  const insertStatements = customers.map((customer: any) => env.DB.prepare(
    "INSERT INTO customer_inbox_notifications (id,customer_id,title,body,created_at,read_at) VALUES (?,?,?,?,?,NULL)"
  ).bind(crypto.randomUUID(), customer.id, title, message, now));
  for (let i = 0; i < insertStatements.length; i += 50) {
    await env.DB.batch(insertStatements.slice(i, i + 50));
  }

  const pushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
  let pushSent = 0;
  let pushFailed = 0;
  if (pushConfigured) {
    const subscriptionsResult = await env.DB.prepare("SELECT customer_id,subscription_json FROM customer_push_subscriptions").all<any>();
    const subscriptions = subscriptionsResult.results || [];
    for (let i = 0; i < subscriptions.length; i += 10) {
      const chunk = subscriptions.slice(i, i + 10);
      const outcomes = await Promise.all(chunk.map(async (row: any) => {
        try {
          const delivered = await sendPushNotification(JSON.parse(row.subscription_json), {
            title, body: message, url: "/account", tag: "store-announcement-" + crypto.randomUUID()
          }, {
            publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY!, subject: env.VAPID_SUBJECT!
          }, { ttl: 86400, urgency: "normal" });
          if (!delivered) {
            await env.DB.prepare("DELETE FROM customer_push_subscriptions WHERE customer_id=?").bind(row.customer_id).run();
            return "expired";
          }
          return "sent";
        } catch (error) {
          console.error("Owner announcement push failed", error);
          return "failed";
        }
      }));
      for (const outcome of outcomes) {
        if (outcome === "sent") pushSent++;
        else if (outcome === "failed") pushFailed++;
      }
    }
  }
  return json({
    ok: true,
    recipientCount: customers.length,
    pushSent,
    pushFailed,
    pushConfigured
  }, 200, { "cache-control": "no-store" });
};
