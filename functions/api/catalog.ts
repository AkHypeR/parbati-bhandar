import { json, isOwner, type Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const owner = await isOwner(request, env);
  const [products, settings] = await Promise.all([
    env.DB.prepare("SELECT data FROM products ORDER BY updated_at DESC").all<{ data: string }>(),
    env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>()
  ]);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cart_stock_reservations (
    reservation_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    expires_at INTEGER NOT NULL, PRIMARY KEY(reservation_id,product_id)
  )`).run();
  const activeHolds = await env.DB.prepare("SELECT product_id, SUM(quantity) AS quantity FROM cart_stock_reservations WHERE expires_at>? GROUP BY product_id").bind(Date.now()).all<any>();
  const heldByProduct = new Map((activeHolds.results || []).map((row:any)=>[String(row.product_id),Number(row.quantity)||0]));
  const visibleProducts = (products.results || []).map(row => {
    const product = JSON.parse(row.data);
    // Treat zero inventory as unavailable even for older rows that predate the
    // server-side stock normalization.
    if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0) {
      product.inStock = false;
    }
    // Inventory counts and reorder thresholds are owner-only. Customers receive
    // only the public availability flag used by the storefront.
    if (!owner) {
      const held = heldByProduct.get(String(product.id)) || 0;
      if (typeof product.stockQuantity === "number" && product.inStock !== false && product.stockQuantity - held <= 0) product.inStock = false;
      delete product.stockQuantity;
      delete product.lowStockThreshold;
    }
    return product;
  });
  return json({ products: visibleProducts, settings: settings ? JSON.parse(settings.data) : null }, 200, {
    "cache-control": "private, no-store",
    "vary": "Cookie"
  });
};
