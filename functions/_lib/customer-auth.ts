import { json, type Env } from "./env";

export type Customer = { id: string; name: string; phone: string };
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

function cookieValue(request: Request, name: string) {
  return request.headers.get("Cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="))?.slice(name.length + 1) || "";
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, material, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
}
export async function ensureCustomerTables(env: Env) {
  // Account creation and sign-in must not depend on the legacy orders schema.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_accounts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_sessions (
    token_hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_login_attempts (
    attempt_key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0,
    window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0
  )`).run();

  // Earlier versions of the account feature may have left partial tables behind.
  // CREATE TABLE IF NOT EXISTS does not add missing columns, so upgrade the
  // account tables explicitly before any registration/login query uses them.
  const accountInfo = await env.DB.prepare("PRAGMA table_info(customer_accounts)").all<any>();
  const accountColumns = new Set((accountInfo.results || []).map((column: any) => String(column.name)));
  if (!accountColumns.has("id") || !accountColumns.has("phone")) {
    throw new Error("Customer account table has an incompatible legacy schema.");
  }
  const accountUpgrades: Array<[string, string]> = [
    ["name", "ALTER TABLE customer_accounts ADD COLUMN name TEXT NOT NULL DEFAULT ''"],
    ["password_hash", "ALTER TABLE customer_accounts ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"],
    ["password_salt", "ALTER TABLE customer_accounts ADD COLUMN password_salt TEXT NOT NULL DEFAULT ''"],
    ["created_at", "ALTER TABLE customer_accounts ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0"],
    ["updated_at", "ALTER TABLE customer_accounts ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0"]
  ];
  for (const [column, sql] of accountUpgrades) {
    if (!accountColumns.has(column)) await env.DB.prepare(sql).run();
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_phone ON customer_accounts(phone)").run();

  const sessionInfo = await env.DB.prepare("PRAGMA table_info(customer_sessions)").all<any>();
  const sessionColumns = new Set((sessionInfo.results || []).map((column: any) => String(column.name)));
  const sessionUpgrades: Array<[string, string]> = [
    ["token_hash", "ALTER TABLE customer_sessions ADD COLUMN token_hash TEXT"],
    ["customer_id", "ALTER TABLE customer_sessions ADD COLUMN customer_id TEXT"],
    ["expires_at", "ALTER TABLE customer_sessions ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0"],
    ["created_at", "ALTER TABLE customer_sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0"]
  ];
  for (const [column, sql] of sessionUpgrades) {
    if (!sessionColumns.has(column)) await env.DB.prepare(sql).run();
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token_hash)").run();

  const attemptsInfo = await env.DB.prepare("PRAGMA table_info(customer_login_attempts)").all<any>();
  const attemptsColumns = new Set((attemptsInfo.results || []).map((column: any) => String(column.name)));
  const attemptsUpgrades: Array<[string, string]> = [
    ["attempt_key", "ALTER TABLE customer_login_attempts ADD COLUMN attempt_key TEXT"],
    ["failures", "ALTER TABLE customer_login_attempts ADD COLUMN failures INTEGER NOT NULL DEFAULT 0"],
    ["window_started", "ALTER TABLE customer_login_attempts ADD COLUMN window_started INTEGER NOT NULL DEFAULT 0"],
    ["blocked_until", "ALTER TABLE customer_login_attempts ADD COLUMN blocked_until INTEGER NOT NULL DEFAULT 0"]
  ];
  for (const [column, sql] of attemptsUpgrades) {
    if (!attemptsColumns.has(column)) await env.DB.prepare(sql).run();
  }
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_login_attempts_key ON customer_login_attempts(attempt_key)").run();

  // Upgrade order history independently. A legacy order-table problem must
  // never block registration or login.
  try {
    const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
    const existing = new Set((columns.results || []).map((column: any) => String(column.name)));
    if (existing.size) {
      const upgrades: Array<[string, string]> = [
        ["customer_id", "ALTER TABLE customer_orders ADD COLUMN customer_id TEXT"],
        ["order_number", "ALTER TABLE customer_orders ADD COLUMN order_number INTEGER"],
        ["stock_deducted", "ALTER TABLE customer_orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0"],
        ["confirmed_at", "ALTER TABLE customer_orders ADD COLUMN confirmed_at INTEGER"]
      ];
      for (const [column, sql] of upgrades) {
        if (!existing.has(column)) await env.DB.prepare(sql).run();
      }
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_customer_orders_customer ON customer_orders(customer_id, created_at DESC)").run();
    }
  } catch (error) {
    console.error("Customer order-history schema upgrade deferred", error);
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at)").run();
}
export async function getCustomer(request: Request, env: Env): Promise<Customer | null> {
  const token = cookieValue(request, "pb_customer");
  if (!token || token.length < 32) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT a.id,a.name,a.phone FROM customer_sessions s
    JOIN customer_accounts a ON a.id=s.customer_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash, Date.now()).first<Customer>();
  return row || null;
}
export async function createCustomerSession(customerId: string, env: Env) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, "0")).join("");
  const now = Date.now();
  const expires = now + SESSION_DAYS * 86400000;
  await env.DB.prepare("INSERT INTO customer_sessions(token_hash,customer_id,expires_at,created_at) VALUES(?,?,?,?)")
    .bind(await sha256(token), customerId, expires, now).run();
  return { cookie: `pb_customer=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}` };
}
export async function clearCustomerSession(request: Request, env: Env) {
  const token = cookieValue(request, "pb_customer");
  if (token) await env.DB.prepare("DELETE FROM customer_sessions WHERE token_hash=?").bind(await sha256(token)).run();
}
export function normalizeCustomerInput(body: any) {
  const name = String(body?.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const phone = String(body?.phone || "").replace(/\D/g, "").slice(-10);
  const password = String(body?.password || "");
  return { name, phone, password };
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, b => b.toString(16).padStart(2, "0")).join("");
  return { salt: saltHex, hash: await passwordHash(password, salt) };
}
export async function verifyPassword(password: string, saltHex: string, expected: string) {
  if (!/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map(v => parseInt(v, 16)));
  const actual = await passwordHash(password, salt);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export { json };
