import { json, type Env } from "../_lib/env";
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [products, settings] = await Promise.all([
    env.DB.prepare("SELECT data FROM products ORDER BY updated_at DESC").all<{ data: string }>(),
    env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>()
  ]);
  return json({ products: (products.results || []).map(row => JSON.parse(row.data)), settings: settings ? JSON.parse(settings.data) : null }, 200, { "cache-control": "public, max-age=30, stale-while-revalidate=120" });
};
