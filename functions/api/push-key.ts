import { json, type Env } from "../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: "Push notifications are not fully configured yet. Please contact the store owner." }, 503, { "cache-control": "no-store" });
  return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, { "cache-control": "no-store" });
};
