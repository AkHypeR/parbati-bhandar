import { json, isOwner, type Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const owner = await isOwner(request, env);
  const [products, settings] = await Promise.all([
    env.DB.prepare("SELECT data FROM products ORDER BY updated_at DESC").all<{ data: string }>(),
    env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>()
  ]);
  const visibleProducts = (products.results || []).map(row => {
    const product = JSON.parse(row.data);
    // Inventory counts and reorder thresholds are owner-only. Customers receive
    // only the public availability flag used by the storefront.
    if (!owner) {
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
