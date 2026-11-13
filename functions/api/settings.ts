import { json, ownerRequired, type Env } from "../_lib/env";

type StoreSettings = Record<string, unknown>;

async function readSettings(env: Env): Promise<StoreSettings> {
  const row = await env.DB.prepare("SELECT data FROM store_settings WHERE id = 1").first<{ data: string }>();
  try {
    return row?.data ? JSON.parse(row.data) as StoreSettings : {};
  } catch {
    return {};
  }
}

async function writeSettings(env: Env, settings: StoreSettings) {
  await env.DB.prepare(
    "INSERT INTO store_settings (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at"
  ).bind(JSON.stringify(settings), Date.now()).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const settings = await readSettings(env);
  let maintenanceMode = settings.maintenanceMode === true;
  let maintenanceUntil = typeof settings.maintenanceUntil === "number" ? settings.maintenanceUntil : null;

  if (maintenanceMode && maintenanceUntil !== null && Date.now() >= maintenanceUntil) {
    maintenanceMode = false;
    maintenanceUntil = null;
    await writeSettings(env, { ...settings, maintenanceMode: false, maintenanceUntil: null });
  }

  return json({
    settings: { maintenanceMode, maintenanceUntil },
  }, 200, { "cache-control": "no-store" });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;

  let updates: StoreSettings;
  try {
    updates = await request.json() as StoreSettings;
  } catch {
    return json({ error: "Invalid settings." }, 400);
  }
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return json({ error: "Invalid settings." }, 400);
  }

  const current = await readSettings(env);
  const next: StoreSettings = { ...current, ...updates };

  // Ordinary store-settings saves must not be forced to include maintenanceMode.
  // Only change maintenance state when the caller explicitly supplies it.
  if (Object.prototype.hasOwnProperty.call(updates, "maintenanceMode")) {
    if (typeof updates.maintenanceMode !== "boolean") {
      return json({ error: "Invalid maintenance setting." }, 400);
    }

    if (updates.maintenanceMode === true && updates.durationMinutes !== undefined) {
      const duration = Number(updates.durationMinutes);
      if (!Number.isFinite(duration) || duration < 1 || duration > 10080) {
        return json({ error: "Timer must be between 1 minute and 7 days." }, 400);
      }
      next.maintenanceUntil = Date.now() + duration * 60_000;
    } else if (updates.maintenanceMode === false) {
      next.maintenanceUntil = null;
    } else if (updates.maintenanceMode === true && !Object.prototype.hasOwnProperty.call(updates, "durationMinutes")) {
      // Preserve an existing scheduled expiry when changing unrelated settings.
      next.maintenanceUntil = current.maintenanceUntil ?? null;
    }
  } else {
    // Ignore any client-supplied expiry unless changing maintenance explicitly.
    next.maintenanceMode = current.maintenanceMode === true;
    next.maintenanceUntil = typeof current.maintenanceUntil === "number" ? current.maintenanceUntil : null;
  }

  delete next.durationMinutes;
  await writeSettings(env, next);
  return json({
    ok: true,
    maintenanceMode: next.maintenanceMode === true,
    maintenanceUntil: typeof next.maintenanceUntil === "number" ? next.maintenanceUntil : null,
  });
};
