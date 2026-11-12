import { json, type Env } from "../../_lib/env";
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.OWNER_PASSWORD || !env.SESSION_SECRET) return json({ error: "Owner login is not configured yet." }, 503);
  let body: { password?: string };
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const supplied = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.password || ""));
  const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.OWNER_PASSWORD));
  const a = new Uint8Array(supplied), b = new Uint8Array(expected);
  let diff = a.length ^ b.length; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return json({ error: "Incorrect owner password." }, 401);
  const payload = String(Date.now() + 1000 * 60 * 60 * 12);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const signature = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return json({ ok: true }, 200, { "set-cookie": `pb_owner=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200` });
};
