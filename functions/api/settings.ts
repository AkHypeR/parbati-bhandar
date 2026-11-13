import { json, ownerRequired, type Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>();
  let settings: Record<string, unknown> = {};
  try { settings = row?.data ? JSON.parse(row.data) as Record<string, unknown> : {}; } catch { settings = {}; }
  return json({ settings: { maintenanceMode: settings.maintenanceMode === true } });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  let updates: Record<string, unknown>;
  try { updates = await request.json() as Record<string, unknown>; } catch { return json({ error: "Invalid settings." }, 400); }
  if (typeof updates.maintenanceMode !== "boolean") return json({ error: "Invalid maintenance setting." }, 400);
  const row = await env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>();
  let current: Record<string, unknown> = {};
  try { current = row?.data ? JSON.parse(row.data) as Record<string, unknown> : {}; } catch { current = {}; }
  const settings = { ...current, maintenanceMode: updates.maintenanceMode };
  await env.DB.prepare("INSERT INTO store_settings (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at").bind(JSON.stringify(settings), Date.now()).run();
  return json({ ok: true, maintenanceMode: settings.maintenanceMode });
};