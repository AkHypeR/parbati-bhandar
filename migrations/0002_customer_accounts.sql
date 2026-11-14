-- Minimal customer accounts. Passwords are PBKDF2 hashes with per-account random salts.
CREATE TABLE IF NOT EXISTS customer_orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  note TEXT,
  items_json TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  order_number INTEGER,
  customer_id TEXT,
  stock_deducted INTEGER NOT NULL DEFAULT 0,
  confirmed_at INTEGER
);
CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);
CREATE TABLE IF NOT EXISTS customer_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);
-- Existing customer_orders tables receive customer_id from the idempotent runtime schema bootstrap.\n