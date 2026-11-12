export interface Env {
  DB: D1Database;
  OWNER_PASSWORD: string;
  SESSION_SECRET: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}
export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
export async function isOwner(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get("Cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("pb_owner="))?.slice(9);
  if (!token || !env.SESSION_SECRET) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(payload));
  if (!valid) return false;
  try { return Number(payload) > Date.now(); } catch { return false; }
}
export async function ownerRequired(request: Request, env: Env) {
  return await isOwner(request, env) ? null : json({ error: "Owner login required." }, 401);
}
