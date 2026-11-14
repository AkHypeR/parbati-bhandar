import { json, type Env } from "../../_lib/env";
import { createCustomerSession, ensureCustomerTables, normalizeCustomerInput, verifyPassword } from "../../_lib/customer-auth";
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any; try { body = await request.json(); } catch { return json({error:"Invalid request."},400); }
  const {phone,password} = normalizeCustomerInput(body);
  if (!/^[6-9]\d{9}$/.test(phone) || password.length < 1 || password.length > 128) return json({error:"Enter your registered phone number and password."},400);
  await ensureCustomerTables(env);
  const now = Date.now(), ip = request.headers.get("CF-Connecting-IP") || "unknown";
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_login_attempts(
    attempt_key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
    window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0
  )`).run();
  const attemptKey = (await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip+"|"+phone))).reduce((s,b)=>s+b.toString(16).padStart(2,"0"),"");
  const attempt = await env.DB.prepare("SELECT failures,window_started,blocked_until FROM customer_login_attempts WHERE attempt_key=?").bind(attemptKey).first<any>();
  if (Number(attempt?.blocked_until || 0) > now) return json({error:"Too many attempts. Please wait 15 minutes and try again."},429,{"cache-control":"no-store"});
  const row = await env.DB.prepare("SELECT id,name,phone,password_hash,password_salt FROM customer_accounts WHERE phone=?").bind(phone).first<any>();
  const valid = row ? await verifyPassword(password,String(row.password_salt),String(row.password_hash)) : false;
  if (!valid) {
    await env.DB.prepare(`INSERT INTO customer_login_attempts(attempt_key,failures,window_started,blocked_until)
      VALUES(?,1,?,0) ON CONFLICT(attempt_key) DO UPDATE SET
      failures=CASE WHEN window_started<? THEN 1 ELSE failures+1 END,
      window_started=CASE WHEN window_started<? THEN excluded.window_started ELSE window_started END,
      blocked_until=CASE WHEN (CASE WHEN window_started<? THEN 1 ELSE failures+1 END)>=5 THEN ? ELSE 0 END`)
      .bind(attemptKey,now,now-900000,now-900000,now-900000,now+900000).run();
    return json({error:"Phone number or password is incorrect."},401,{"cache-control":"no-store"});
  }
  await env.DB.prepare("DELETE FROM customer_login_attempts WHERE attempt_key=?").bind(attemptKey).run();
  await env.DB.prepare("UPDATE customer_accounts SET updated_at=? WHERE id=?").bind(now,row.id).run();
  const session = await createCustomerSession(row.id,env);
  return json({ok:true,customer:{id:row.id,name:row.name,phone:row.phone}},200,{"set-cookie":session.cookie,"cache-control":"no-store"});
};
