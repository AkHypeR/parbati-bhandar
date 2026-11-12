import { json, type Env } from "../../_lib/env";
export const onRequestPost: PagesFunction<Env> = async () => json({ ok: true }, 200, { "set-cookie": "pb_owner=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0" });
