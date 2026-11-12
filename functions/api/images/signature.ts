import { json, ownerRequired, type Env } from "../../_lib/env";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return json({ error: "Cloudinary is not configured yet. Add its cloud name, API key, and API secret to the Pages project secrets." }, 503);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "parbati-bhandar/products";
  const signingText = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(signingText));
  const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");

  return json({ cloudName, apiKey, timestamp, folder, signature }, 200, {
    "cache-control": "no-store"
  });
};
