import { json, type Env } from "../_lib/env";
import { ensureCustomerTables, getCustomer } from "../_lib/customer-auth";

const validSubscription = (value: any) => value && typeof value.endpoint === "string" && value.endpoint.startsWith("https://") && typeof value.keys?.p256dh === "string" && typeof value.keys?.auth === "string";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to enable notifications." }, 401, { "cache-control": "no-store" });
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid notification settings." }, 400); }
  const subscription = body?.subscription;
  if (!validSubscription(subscription)) return json({ error: "A valid device notification subscription is required." }, 400);
  const now = Date.now();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS customer_push_subscriptions (customer_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)").run();
  await env.DB.prepare("INSERT INTO customer_push_subscriptions (customer_id,subscription_json,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET subscription_json=excluded.subscription_json,updated_at=excluded.updated_at")
    .bind(customer.id, JSON.stringify({ endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } }), now, now).run();
  return json({ ok: true }, 200, { "cache-control": "no-store" });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  await ensureCustomerTables(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to manage notifications." }, 401, { "cache-control": "no-store" });
  await env.DB.prepare("DELETE FROM customer_push_subscriptions WHERE customer_id=?").bind(customer.id).run();
  return json({ ok: true }, 200, { "cache-control": "no-store" });
};
