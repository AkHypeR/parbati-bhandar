import { json, type Env } from "../../_lib/env";
import { createCustomerSession, ensureCustomerTables, hashPassword, normalizeCustomerInput } from "../../_lib/customer-auth";
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any; try { body = await request.json(); } catch { return json({error:"Invalid request."},400); }
  const {name,phone,password} = normalizeCustomerInput(body);
  if (name.length < 2 || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) return json({error:"Enter your name and a valid 10-digit Indian mobile number."},400);
  if (password.length < 8 || password.length > 128) return json({error:"Password must be at least 8 characters."},400);
  await ensureCustomerTables(env);
  const existing = await env.DB.prepare("SELECT id FROM customer_accounts WHERE phone=?").bind(phone).first();
  if (existing) return json({error:"An account already exists for this phone number. Please sign in."},409);
  const {salt,hash} = await hashPassword(password);
  const id = crypto.randomUUID(), now = Date.now();
  try {
    await env.DB.prepare("INSERT INTO customer_accounts(id,name,phone,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
      .bind(id,name,phone,hash,salt,now,now).run();
  } catch { return json({error:"Could not create the account. Please try again."},503); }
  // Attach any recent guest orders already placed with this phone number.
  await env.DB.prepare("UPDATE customer_orders SET customer_id=? WHERE customer_phone=? AND customer_id IS NULL").bind(id,phone).run();
  const session = await createCustomerSession(id,env);
  return json({ok:true,customer:{id,name,phone}},201,{"set-cookie":session.cookie,"cache-control":"no-store"});
};
