import { json, type Env } from "../../_lib/env";
import { createCustomerSession, ensureCustomerTables, hashPassword, normalizeCustomerInput } from "../../_lib/customer-auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let stage = "request";
  try {
    let body: any;
    try { body = await request.json(); } catch { return json({ error: "Please check the details and try again." }, 400); }
    const { name, phone, password } = normalizeCustomerInput(body);
    if (name.length < 2 || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      return json({ error: "Enter your name and a valid 10-digit Indian mobile number." }, 400);
    }
    if (password.length < 8 || password.length > 128) {
      return json({ error: "Choose a password with at least 8 characters." }, 400);
    }
    if (!env.DB) return json({ error: "Customer accounts are not connected yet. Please contact the store owner." }, 503);

    stage = "database_setup";
    await ensureCustomerTables(env);
    stage = "account_lookup";
    const existing = await env.DB.prepare("SELECT id FROM customer_accounts WHERE phone=?").bind(phone).first();
    if (existing) return json({ error: "An account already exists for this mobile number. Please sign in instead." }, 409);

    stage = "password_hash";
    const { salt, hash } = await hashPassword(password);
    const id = crypto.randomUUID(), now = Date.now();
    try {
      stage = "account_insert";
      await env.DB.prepare("INSERT INTO customer_accounts(id,name,phone,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
        .bind(id, name, phone, hash, salt, now, now).run();
    } catch (error) {
      console.error("Customer registration insert failed", error);
      const duplicate = await env.DB.prepare("SELECT id FROM customer_accounts WHERE phone=?").bind(phone).first();
      if (duplicate) return json({ error: "An account already exists for this mobile number. Please sign in instead." }, 409);
      return json({ error: "We couldn't create your account just now. Please try again." }, 503);
    }

    // Linking older guest orders is helpful, but must not prevent a new account from signing in.
    try {
      stage = "legacy_order_link";
      await env.DB.prepare("UPDATE customer_orders SET customer_id=? WHERE customer_phone=? AND customer_id IS NULL").bind(id, phone).run();
    } catch (error) { console.error("Customer order linking failed", error); }

    try {
      stage = "session_create";
      const session = await createCustomerSession(id, env);
      return json({ ok: true, customer: { id, name, phone } }, 201, { "set-cookie": session.cookie, "cache-control": "no-store" });
    } catch (error) {
      console.error("Customer session creation after registration failed", error);
      return json({ error: "Your account was created, but sign-in couldn't finish. Please sign in with the mobile number and password you just registered." }, 503);
    }
  } catch (error) {
    console.error("Customer registration service failed at stage:", stage, error);
    return json({ error: "The account service is temporarily unavailable. Please try again in a moment.", code: `registration_${stage}_failed` }, 503, { "cache-control": "no-store" });
  }
};
