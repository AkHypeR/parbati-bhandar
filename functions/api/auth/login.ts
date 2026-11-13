import { json, type Env } from "../../_lib/env";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.OWNER_PASSWORD || !env.SESSION_SECRET) return json({ error: "Owner login is not configured yet." }, 503);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS owner_login_attempts (ip TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0)").run();
    const record = await env.DB.prepare("SELECT failures,window_started,blocked_until FROM owner_login_attempts WHERE ip=?").bind(ip).first<any>();
    if (record && Number(record.blocked_until) > now) {
      return json({ error: "Too many unsuccessful attempts. Please wait 15 minutes before trying again." }, 429, { "cache-control": "no-store" });
    }
  } catch {
    return json({ error: "Login security is temporarily unavailable. Please try again later." }, 503);
  }
  let body: { password?: string };
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const supplied = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.password || ""));
  const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.OWNER_PASSWORD));
  const a = new Uint8Array(supplied), b = new Uint8Array(expected);
  let diff = a.length ^ b.length; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) {
    try {
      await env.DB.prepare(`INSERT INTO owner_login_attempts (ip,failures,window_started,blocked_until) VALUES (?,1,?,0)
        ON CONFLICT(ip) DO UPDATE SET
        failures=CASE WHEN owner_login_attempts.window_started < ? THEN 1 ELSE owner_login_attempts.failures+1 END,
        window_started=CASE WHEN owner_login_attempts.window_started < ? THEN excluded.window_started ELSE owner_login_attempts.window_started END,
        blocked_until=CASE WHEN (CASE WHEN owner_login_attempts.window_started < ? THEN 1 ELSE owner_login_attempts.failures+1 END) >= ? THEN ? ELSE 0 END`)
        .bind(ip,now,now-WINDOW_MS,now-WINDOW_MS,now-WINDOW_MS,MAX_FAILURES,now+WINDOW_MS).run();
    } catch { return json({ error: "Login security is temporarily unavailable. Please try again later." }, 503); }
    return json({ error: "Incorrect owner password." }, 401, { "cache-control": "no-store" });
  }
  await env.DB.prepare("DELETE FROM owner_login_attempts WHERE ip=?").bind(ip).run();
  const payload = String(now + 1000 * 60 * 60 * 12);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const signature = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return json({ ok: true }, 200, { "set-cookie": `pb_owner=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`, "cache-control": "no-store" });
};
