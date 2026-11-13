import { json, ownerRequired, type Env } from "../_lib/env";
import { sendPushNotification } from "@mmmike/web-push/send";

type OrderItem = { productId?: string; name: string; quantity: number; unit: string; price: number; unavailable?: boolean };
const ensureTable = async (env: Env) => {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (order_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
   id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
   note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'new',
   created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, order_number INTEGER
  )`).run();
  const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
  if (!(columns.results || []).some((column: any) => column.name === "order_number")) {
    await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN order_number INTEGER").run();
  }
  if (!(columns.results || []).some((column: any) => column.name === "stock_deducted")) await env.DB.prepare("ALTER TABLE customer_orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0").run();
  const unnumbered = await env.DB.prepare("SELECT id FROM customer_orders WHERE order_number IS NULL ORDER BY created_at ASC, id ASC").all<any>();
  let nextNumber = 1;
  for (const row of unnumbered.results || []) {
    await env.DB.prepare("UPDATE customer_orders SET order_number=? WHERE id=?").bind(nextNumber++, row.id).run();
  }
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_sequence (name TEXT PRIMARY KEY, value INTEGER NOT NULL)").run();
  const maximum = await env.DB.prepare("SELECT COALESCE(MAX(order_number),0) AS value FROM customer_orders").first<any>();
  await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',?) ON CONFLICT(name) DO UPDATE SET value=MAX(value,excluded.value)").bind(Number(maximum?.value || 0)).run();
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.TURNSTILE_SECRET_KEY) return json({ error: "Order security is not configured yet." }, 503);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid order." }, 400); }
  const turnstileToken = String(body?.turnstileToken || "").slice(0, 2048);
  if (!turnstileToken) return json({ error: "Please complete the security check." }, 400);
  try {
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }) });
    const verification: any = await verifyResponse.json();
    if (!verification.success || verification.action !== "order") return json({ error: "Security check failed. Please try again." }, 403);
  } catch { return json({ error: "Security verification is temporarily unavailable. Please try again." }, 503); }
  await ensureTable(env);
  const name = String(body?.customerName || "").trim().slice(0, 100);
  const phone = String(body?.customerPhone || "").replace(/\D/g, "").slice(0, 15);
  const note = String(body?.note || "").trim().slice(0, 500);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 100).map((x: any) => ({
    productId: x.productId ? String(x.productId).slice(0, 100) : undefined, name: String(x.name || "").slice(0, 120), quantity: Math.max(1, Math.min(999, Number(x.quantity) || 1)),
    unit: String(x.unit || "").slice(0, 30), price: Math.max(0, Number(x.price) || 0)
  })) : [];
  if (!name || phone.length < 10 || phone.length > 15 || !items.length || items.some((x: OrderItem) => !x.name)) return json({ error: "Please enter your name, valid phone number and at least one item." }, 400);
  const total = items.reduce((sum: number, x: OrderItem) => sum + x.price * x.quantity, 0);
  const sequence = await env.DB.prepare("INSERT INTO order_sequence (name,value) VALUES ('customer_orders',1) ON CONFLICT(name) DO UPDATE SET value=value+1 RETURNING value").first<any>();
  const orderNumber = Number(sequence?.value || 1);
  const id = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare("INSERT INTO customer_orders (id,order_number,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'new',?,?)")
    .bind(id,orderNumber,name,phone,note,JSON.stringify(items),total,now,now).run();
  const subscription = body?.pushSubscription;
  if (subscription && typeof subscription.endpoint === "string" && typeof subscription.keys?.p256dh === "string" && typeof subscription.keys?.auth === "string" && subscription.endpoint.startsWith("https://")) {
    await env.DB.prepare("INSERT OR REPLACE INTO push_subscriptions (order_id,subscription_json,created_at) VALUES (?,?,?)")
      .bind(id,JSON.stringify({endpoint:subscription.endpoint,keys:{p256dh:subscription.keys.p256dh,auth:subscription.keys.auth}}),now).run();
  }
  return json({ ok: true, orderId: id, orderNumber }, 201, { "cache-control": "no-store" });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  // Automatically clear completed/cancelled orders after 7 days.
  await env.DB.prepare("DELETE FROM customer_orders WHERE status IN ('completed','cancelled') AND updated_at < ?").bind(Date.now() - 7*86400000).run();
  const rows = await env.DB.prepare("SELECT id,order_number,customer_name,customer_phone,note,items_json,total,status,created_at,updated_at FROM customer_orders ORDER BY order_number DESC LIMIT 100").all<any>();
  return json({ orders: (rows.results || []).map((r: any) => ({ id:r.id, orderNumber:r.order_number, customerName:r.customer_name, customerPhone:r.customer_phone, note:r.note, items:JSON.parse(r.items_json), total:r.total, status:r.status, createdAt:r.created_at, updatedAt:r.updated_at })) }, 200, { "cache-control": "no-store" });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  let body: any; try { body = await request.json(); } catch { return json({error:"Invalid update."},400); }
  const status = String(body?.status || "");
  if (!["new","review","ready","unavailable","completed","cancelled"].includes(status) || !body?.id) return json({error:"Invalid order status."},400);
  const id = String(body.id);
  const order = await env.DB.prepare("SELECT status,customer_name,order_number,items_json,stock_deducted FROM customer_orders WHERE id=?").bind(id).first<any>();
  if (!order) return json({error:"Order not found."},404);
  const items: OrderItem[] = Array.isArray(body.items) ? body.items.map((x: any) => ({...x, unavailable: !!x.unavailable})) : JSON.parse(order.items_json || "[]");
  if (status === "ready" && !Number(order.stock_deducted || 0)) {
    const updates: Array<{id:string; data:string; updatedAt:number}> = [];
    for (const item of items) {
      if (item.unavailable || !item.productId) continue;
      const row = await env.DB.prepare("SELECT data FROM products WHERE id=?").bind(item.productId).first<any>();
      if (!row) continue;
      const product = JSON.parse(row.data);
      if (typeof product.stockQuantity !== "number") continue;
      if (String(item.unit).trim().toLowerCase() !== String(product.unit || "").trim().toLowerCase()) return json({error:"Stock unit mismatch for " + item.name + ". Review the product unit before confirming."},409);
      if (product.stockQuantity < item.quantity) return json({error:"Not enough stock for " + item.name + ". Mark it unavailable or update stock."},409);
      product.stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
      if (product.stockQuantity === 0) product.inStock = false;
      product.updatedAt = Date.now();
      updates.push({id:item.productId,data:JSON.stringify(product),updatedAt:product.updatedAt});
    }
    const claimed = await env.DB.prepare("UPDATE customer_orders SET stock_deducted=1 WHERE id=? AND stock_deducted=0").bind(id).run();
    if (!claimed.meta.changes) return json({error:"Stock was already deducted for this order."},409);
    for (const u of updates) await env.DB.prepare("UPDATE products SET data=?,updated_at=? WHERE id=?").bind(u.data,u.updatedAt,u.id).run();
  }
  const result = await env.DB.prepare("UPDATE customer_orders SET status=?,items_json=?,updated_at=? WHERE id=?").bind(status,JSON.stringify(items),Date.now(),id).run();
  let notification = "not-configured";
  if (["ready","unavailable","completed","cancelled"].includes(status) && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    const saved = await env.DB.prepare("SELECT subscription_json FROM push_subscriptions WHERE order_id=?").bind(id).first<any>();
    if (saved?.subscription_json) {
      const messages: Record<string,{title:string;body:string}> = {
        ready:{title:"Your order is ready!",body:"Order #" + order.order_number + " is ready for pickup at Parbati Bhandar."},
        unavailable:{title:"Order update from Parbati Bhandar",body:"There is an availability update for order #" + order.order_number + ". Please contact the store."},
        completed:{title:"Order completed",body:"Order #" + order.order_number + " has been marked completed. Thank you!"},
        cancelled:{title:"Order cancelled",body:"Order #" + order.order_number + " has been cancelled. Please contact the store if you have questions."}
      };
      try {
        const delivered = await sendPushNotification(JSON.parse(saved.subscription_json),{...messages[status],url:"/",tag:"order-" + id},{publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT},{ttl:3600,urgency:"high"});
        notification = delivered ? "sent" : "subscription-expired";
        if (!delivered) await env.DB.prepare("DELETE FROM push_subscriptions WHERE order_id=?").bind(id).run();
      } catch (error) { console.error("Order push notification failed",error); notification = "send-failed"; }
    } else notification = "customer-not-subscribed";
  }
  return json({ok:true,changes:result.meta.changes,notification});
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  await ensureTable(env);
  let body: any; try { body = await request.json(); } catch { return json({ error: "Invalid delete request." }, 400); }
  const id = String(body?.id || "").trim();
  if (!id) return json({ error: "Order ID is required." }, 400);
  const result = await env.DB.prepare("DELETE FROM customer_orders WHERE id=?").bind(id).run();
  return json({ ok: true, changes: result.meta.changes }, 200, { "cache-control": "no-store" });
};
