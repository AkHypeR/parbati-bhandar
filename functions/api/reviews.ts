import { json, ownerRequired, type Env } from "../_lib/env";
import { ensureCustomerTables, getCustomer } from "../_lib/customer-auth";

async function ensureReviewTable(env: Env) {
  await ensureCustomerTables(env);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS product_reviews (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(product_id, customer_id)
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_product_reviews_public ON product_reviews(product_id,status)").run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  await ensureReviewTable(env);
  if (await isOwnerSession(request, env)) {
    const rows = await env.DB.prepare("SELECT id,product_id,customer_name,rating,comment,status,created_at FROM product_reviews ORDER BY created_at DESC LIMIT 300").all<any>();
    return json({ reviews: rows.results || [] }, 200, { "cache-control": "no-store" });
  }
  const rows = await env.DB.prepare("SELECT product_id,ROUND(AVG(rating),1) AS average,COUNT(*) AS count FROM product_reviews WHERE status='approved' GROUP BY product_id").all<any>();
  const ratings: Record<string,{average:number;count:number}> = {};
  for (const row of rows.results || []) ratings[String(row.product_id)] = { average:Number(row.average)||0, count:Number(row.count)||0 };
  return json({ ratings }, 200, { "cache-control": "public, max-age=60" });
};

async function isOwnerSession(request: Request, env: Env) {
  const denied = await ownerRequired(request, env);
  return denied === null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await ensureReviewTable(env);
  const customer = await getCustomer(request, env);
  if (!customer) return json({ error: "Please sign in to your customer account before reviewing a product." }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid review." }, 400); }
  const productId = String(body?.productId || "").trim().slice(0,100);
  const rating = Number(body?.rating);
  const comment = String(body?.comment || "").trim().slice(0,500);
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "Choose a product and a rating from 1 to 5 stars." }, 400);
  const product = await env.DB.prepare("SELECT id FROM products WHERE id=?").bind(productId).first<any>();
  if (!product) return json({ error: "This product is no longer in the catalogue." }, 404);
  const purchase = await env.DB.prepare(`SELECT id FROM customer_orders
    WHERE customer_id=? AND status IN ('ready','completed')
      AND EXISTS (SELECT 1 FROM json_each(customer_orders.items_json) item
        WHERE json_extract(item.value,'$.productId')=?)
    LIMIT 1`).bind(customer.id, productId).first<any>();
  if (!purchase) return json({ error: "You can review this item after it has been included in a confirmed order." }, 403);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO product_reviews
    (id,product_id,customer_id,customer_name,rating,comment,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,'pending',?,?)
    ON CONFLICT(product_id,customer_id) DO UPDATE SET
      customer_name=excluded.customer_name,rating=excluded.rating,comment=excluded.comment,
      status='pending',updated_at=excluded.updated_at`)
    .bind(crypto.randomUUID(),productId,customer.id,customer.name,rating,comment,now,now).run();
  return json({ ok: true, status: "pending" }, 201, { "cache-control": "no-store" });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  await ensureReviewTable(env);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid moderation request." }, 400); }
  const id = String(body?.id || "").trim();
  const status = String(body?.status || "");
  if (!id || !["approved","rejected"].includes(status)) return json({ error: "Choose a review and a valid moderation status." }, 400);
  const result = await env.DB.prepare("UPDATE product_reviews SET status=?,updated_at=? WHERE id=?").bind(status,Date.now(),id).run();
  if (!result.meta.changes) return json({ error: "Review not found." }, 404);
  return json({ ok: true });
};
