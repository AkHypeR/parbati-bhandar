import { json, ownerRequired, type Env } from "../_lib/env";
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env); if (denied) return denied;
  let body: { dataUrl?: string; folder?: string }; try { body = await request.json(); } catch { return json({ error: "Invalid upload." }, 400); }
  const match = (body.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json({ error: "Only JPG, PNG and WebP images are supported." }, 400);
  const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (binary.byteLength > 2 * 1024 * 1024) return json({ error: "Image exceeds the 2 MB limit." }, 413);
  const ext = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  const folder = (body.folder || "misc").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "misc";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, binary, { httpMetadata: { contentType: match[1], cacheControl: "public, max-age=31536000, immutable" } });
  return json({ url: `/api/images/${key}` });
};
