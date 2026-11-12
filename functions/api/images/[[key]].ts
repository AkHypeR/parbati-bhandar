import { json, type Env } from "../../_lib/env";
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = Array.isArray(params.key) ? params.key.join("/") : String(params.key || "");
  if (!key || key.includes("..")) return json({ error: "Not found." }, 404);
  const object = await env.IMAGES.get(key);
  if (!object) return json({ error: "Not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
};
