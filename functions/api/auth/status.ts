import { json, type Env } from "../../_lib/env";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return json({
    ownerPasswordConfigured: Boolean(env.OWNER_PASSWORD),
    sessionSecretConfigured: Boolean(env.SESSION_SECRET),
    databaseConfigured: Boolean(env.DB)
  }, 200, {
    "cache-control": "no-store"
  });
};
