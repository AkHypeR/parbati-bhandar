import { json, type Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    if (!env.DB) {
      return json({ error: "D1 binding DB is missing. Check the Pages project's D1 binding for this deployment." }, 500);
    }

    const [products, settings] = await Promise.all([
      env.DB.prepare("SELECT data FROM products ORDER BY updated_at DESC").all<{ data: string }>(),
      env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>()
    ]);

    return json({
      products: (products.results || []).map(row => JSON.parse(row.data)),
      settings: settings ? JSON.parse(settings.data) : null
    }, 200, { "cache-control": "public, max-age=30, stale-while-revalidate=120" });
  } catch (error) {
    console.error("GET /api/catalog failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: "Catalog API failed", detail: message }, 500);
  }
};
