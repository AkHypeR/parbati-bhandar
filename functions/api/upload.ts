import { json, ownerRequired, type Env } from "../_lib/env";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return json({ error: "Cloudinary is not configured. Check the Cloudflare Pages environment variables." }, 500);
  }

  let body: { dataUrl?: string; folder?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid upload request." }, 400);
  }

  const match = (body.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json({ error: "Only JPG, PNG and WebP images are supported." }, 400);

  const binary = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  if (binary.byteLength > 2 * 1024 * 1024) {
    return json({ error: "Image exceeds the 2 MB limit." }, 413);
  }

  const allowedFolders = new Set(["products", "banners", "scanner"]);
  const folder = allowedFolders.has(body.folder || "") ? body.folder! : "products";
  const publicId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signatureParams = `folder=parbati-bhandar/${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(signatureParams + env.CLOUDINARY_API_SECRET)
  );
  const signature = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const form = new FormData();
  form.set("file", body.dataUrl!);
  form.set("api_key", env.CLOUDINARY_API_KEY);
  form.set("timestamp", timestamp);
  form.set("folder", `parbati-bhandar/${folder}`);
  form.set("public_id", publicId);
  form.set("signature", signature);

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  const result = await cloudinaryResponse.json() as { secure_url?: string; error?: { message?: string } };
  if (!cloudinaryResponse.ok || !result.secure_url) {
    return json({ error: result.error?.message || "Cloudinary rejected the image upload." }, 502);
  }

  return json({ url: result.secure_url });
};
