import { json, ownerRequired, type Env } from "../_lib/env";
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  let settings: Record<string, unknown>; try { settings = await request.json(); } catch { return json({ error: "Invalid settings." }, 400); }
  delete settings.ownerPin;
  await env.DB.prepare("INSERT INTO store_settings (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at").bind(JSON.stringify(settings), Date.now()).run();
  return json({ ok: true });
};
