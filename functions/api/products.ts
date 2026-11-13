import { json, ownerRequired, type Env } from "../_lib/env";
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  let products: any[]; try { products = await request.json(); } catch { return json({ error: "Invalid products payload." }, 400); }
  if (!Array.isArray(products) || products.length > 2000) return json({ error: "Invalid product list." }, 400);
  const statements = products.map(p => {
    const normalized = { ...p };
    // A zero inventory count always overrides a stale/manual availability flag.
    if (typeof normalized.stockQuantity === "number" && normalized.stockQuantity <= 0) {
      normalized.stockQuantity = 0;
      normalized.inStock = false;
    }
    return env.DB.prepare("INSERT INTO products (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at").bind(String(normalized.id), JSON.stringify(normalized), Number(normalized.updatedAt) || Date.now());
  });
  if (statements.length) await env.DB.batch(statements);
  return json({ ok: true });
};
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  let body: { ids?: string[] }; try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const ids = (body.ids || []).filter(id => typeof id === "string").slice(0, 2000);
  if (ids.length) await env.DB.batch(ids.map(id => env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id)));
  return json({ ok: true });
};
