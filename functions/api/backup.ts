import { json, ownerRequired, type Env } from "../_lib/env";
import { ensureCustomerTables } from "../_lib/customer-auth";

const BACKUP_TABLES = [
  "products",
  "customer_orders",
  "order_stock_reservations",
  "order_stock_reservation_guard",
  "order_stock_deductions",
  "order_stock_deduction_guard",
  "order_stock_refunds",
  "order_stock_refund_guard",
  "order_stock_refund_checks",
  "order_stock_refund_guard_v2",
  "order_sequence",
] as const;

type BackupTable = typeof BACKUP_TABLES[number];

async function ensureBackupSchema(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS store_settings (
    id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, updated_at INTEGER NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customer_orders (
    id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, customer_phone TEXT NOT NULL,
    note TEXT, items_json TEXT NOT NULL, total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL, order_number INTEGER
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS cart_stock_reservations (
    reservation_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
    expires_at INTEGER NOT NULL, PRIMARY KEY(reservation_id,product_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    order_id TEXT PRIMARY KEY, subscription_json TEXT NOT NULL, created_at INTEGER NOT NULL
  )`).run();

  const columns = await env.DB.prepare("PRAGMA table_info(customer_orders)").all<any>();
  const existing = new Set((columns.results || []).map((column: any) => String(column.name)));
  const upgrades: Array<[string, string]> = [
    ["order_number", "ALTER TABLE customer_orders ADD COLUMN order_number INTEGER"],
    ["customer_id", "ALTER TABLE customer_orders ADD COLUMN customer_id TEXT"],
    ["stock_deducted", "ALTER TABLE customer_orders ADD COLUMN stock_deducted INTEGER NOT NULL DEFAULT 0"],
    ["confirmed_at", "ALTER TABLE customer_orders ADD COLUMN confirmed_at INTEGER"],
    ["ready_at", "ALTER TABLE customer_orders ADD COLUMN ready_at INTEGER"],
    ["archived_at", "ALTER TABLE customer_orders ADD COLUMN archived_at INTEGER"],
    ["estimated_ready_at", "ALTER TABLE customer_orders ADD COLUMN estimated_ready_at INTEGER"],
  ];
  for (const [column, sql] of upgrades) if (!existing.has(column)) await env.DB.prepare(sql).run();

  const definitions: Record<Exclude<BackupTable, "products" | "customer_orders" | "order_sequence">, string> = {
    order_stock_reservations: `CREATE TABLE IF NOT EXISTS order_stock_reservations (
      order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
      PRIMARY KEY(order_id,product_id))`,
    order_stock_reservation_guard: `CREATE TABLE IF NOT EXISTS order_stock_reservation_guard (
      order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
      CHECK(expected_count=actual_count))`,
    order_stock_deductions: `CREATE TABLE IF NOT EXISTS order_stock_deductions (
      order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
      PRIMARY KEY(order_id,product_id))`,
    order_stock_deduction_guard: `CREATE TABLE IF NOT EXISTS order_stock_deduction_guard (
      order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
      CHECK(expected_count=actual_count))`,
    order_stock_refunds: `CREATE TABLE IF NOT EXISTS order_stock_refunds (
      order_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL,
      PRIMARY KEY(order_id,product_id))`,
    order_stock_refund_guard: `CREATE TABLE IF NOT EXISTS order_stock_refund_guard (
      order_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
      CHECK(expected_count=actual_count))`,
    order_stock_refund_checks: `CREATE TABLE IF NOT EXISTS order_stock_refund_checks (
      check_id TEXT NOT NULL, order_id TEXT NOT NULL, product_id TEXT NOT NULL,
      PRIMARY KEY(check_id,product_id))`,
    order_stock_refund_guard_v2: `CREATE TABLE IF NOT EXISTS order_stock_refund_guard_v2 (
      check_id TEXT PRIMARY KEY, expected_count INTEGER NOT NULL, actual_count INTEGER NOT NULL,
      CHECK(expected_count=actual_count))`,
  };
  for (const sql of Object.values(definitions)) await env.DB.prepare(sql).run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS order_sequence (name TEXT PRIMARY KEY, value INTEGER NOT NULL)").run();
  await ensureCustomerTables(env);
}

function validRows(table: BackupTable, rows: any[]) {
  if (!Array.isArray(rows)) return false;
  if (table === "products") return rows.every(row =>
    row && typeof row.id === "string" && row.id.length > 0 && row.id.length <= 200 &&
    typeof row.data === "string" && Number.isFinite(Number(row.updated_at))
  );
  if (table === "customer_orders") return rows.every(row =>
    row && typeof row.id === "string" && row.id.length > 0 &&
    typeof row.customer_name === "string" && typeof row.customer_phone === "string" &&
    typeof row.items_json === "string" && Array.isArray(parseJsonArray(row.items_json)) &&
    Number.isFinite(Number(row.total)) && Number.isFinite(Number(row.created_at)) &&
    Number.isFinite(Number(row.updated_at)) &&
    ["new","processing","review","ready","unavailable","completed","cancelled"].includes(row.status)
  );
  if (table === "order_stock_reservations" || table === "order_stock_deductions" || table === "order_stock_refunds") {
    return rows.every(row => row && typeof row.order_id === "string" &&
      typeof row.product_id === "string" && Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0);
  }
  if (table === "order_stock_refund_checks") return rows.every(row =>
    row && typeof row.check_id === "string" && typeof row.order_id === "string" && typeof row.product_id === "string");
  if (table === "order_stock_reservation_guard" || table === "order_stock_deduction_guard" || table === "order_stock_refund_guard" || table === "order_stock_refund_guard_v2") {
    return rows.every(row => row && typeof (row.order_id || row.check_id) === "string" &&
      Number.isInteger(Number(row.expected_count)) && Number.isInteger(Number(row.actual_count)) &&
      Number(row.expected_count) === Number(row.actual_count));
  }
  return rows.every(row => row && typeof row.name === "string" && Number.isFinite(Number(row.value)));
}

function parseJsonArray(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : null; }
  catch { return null; }
}

function quoteIdentifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error("Invalid database column name.");
  return '"' + value + '"';
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  await ensureBackupSchema(env);

  const tables: Record<string, any[]> = {};
  for (const table of BACKUP_TABLES) {
    const result = await env.DB.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all<any>();
    tables[table] = result.results || [];
  }
  const settings = await env.DB.prepare("SELECT * FROM store_settings WHERE id=1").all<any>();
  const snapshot = {
    format: "parbati-bhandar-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    notes: "Customer password hashes, salts, login attempts, sessions and push subscription secrets are intentionally excluded. Existing customer accounts are preserved during restore.",
    tables,
    storeSettings: settings.results || [],
  };
  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="parbati-bhandar-backup-${new Date().toISOString().slice(0,10)}.json"`,
      "cache-control": "no-store",
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await ownerRequired(request, env);
  if (denied) return denied;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 25 * 1024 * 1024) return json({ error: "Backup file is larger than the 25 MB restore limit." }, 413);

  let backup: any;
  try { backup = await request.json(); } catch { return json({ error: "Invalid backup file." }, 400); }
  if (backup?.format !== "parbati-bhandar-backup" || backup?.version !== 2 ||
      !backup.tables || typeof backup.tables !== "object" || Array.isArray(backup.tables) ||
      !Array.isArray(backup.storeSettings) || backup.storeSettings.length > 1) {
    return json({ error: "This backup version is not supported. Download a new version 2 backup from Store Settings." }, 400);
  }

  const allowed = new Set<string>(BACKUP_TABLES);
  const supplied = Object.keys(backup.tables);
  if (supplied.length !== BACKUP_TABLES.length || supplied.some(name => !allowed.has(name))) {
    return json({ error: "Backup is missing required inventory or order-ledger tables. No live data was changed." }, 400);
  }
  const limits: Record<BackupTable, number> = {
    products: 2000, customer_orders: 10000, order_stock_reservations: 10000,
    order_stock_reservation_guard: 10000, order_stock_deductions: 50000,
    order_stock_deduction_guard: 10000, order_stock_refunds: 50000,
    order_stock_refund_guard: 10000, order_stock_refund_checks: 50000,
    order_stock_refund_guard_v2: 50000, order_sequence: 20,
  };
  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length > limits[table] || !validRows(table, rows)) {
      return json({ error: `The ${table} section is invalid or exceeds its safe restore limit. No live data was changed.` }, 400);
    }
  }
  const settingsRow = backup.storeSettings[0];
  if (settingsRow && (Number(settingsRow.id) !== 1 || typeof settingsRow.data !== "string" || !Number.isFinite(Number(settingsRow.updated_at)))) {
    return json({ error: "Store settings section is invalid. No live data was changed." }, 400);
  }

  await ensureBackupSchema(env);

  // Preserve account credentials and sessions on this installation. Orders may
  // only be restored when their customer_id still belongs to an existing account.
  const accountRows = await env.DB.prepare("SELECT id FROM customer_accounts").all<any>();
  const accountIds = new Set((accountRows.results || []).map((row: any) => String(row.id)));
  const missingCustomers = (backup.tables.customer_orders as any[])
    .filter(row => row.customer_id && !accountIds.has(String(row.customer_id)))
    .map(row => String(row.customer_id));
  if (missingCustomers.length) {
    return json({ error: "This backup contains orders linked to customer accounts that are not present in this store. For security, restore was stopped without changing live data. Restore it to the original store database or contact support for an account-safe migration." }, 409);
  }

  // Ensure every order ledger row refers to an order included in this snapshot.
  const orderIds = new Set((backup.tables.customer_orders as any[]).map(row => String(row.id)));
  for (const table of ["order_stock_reservations","order_stock_deductions","order_stock_refunds"] as BackupTable[]) {
    if ((backup.tables[table] as any[]).some(row => !orderIds.has(String(row.order_id)))) {
      return json({ error: `The ${table} section refers to an order missing from the backup. No live data was changed.` }, 400);
    }
  }

  const statements: any[] = [];
  for (const table of BACKUP_TABLES) {
    const info = await env.DB.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all<any>();
    const columns = (info.results || []).map((column: any) => String(column.name));
    if (!columns.length) return json({ error: `The ${table} database schema is unavailable. No live data was changed.` }, 500);
    const rows = backup.tables[table] as any[];
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          Object.keys(row).length !== columns.length ||
          columns.some(column => !Object.prototype.hasOwnProperty.call(row, column)) ||
          Object.keys(row).some(key => !columns.includes(key))) {
        return json({ error: `The ${table} section does not match this store's database schema. No live data was changed.` }, 400);
      }
    }
    const columnSql = columns.map(quoteIdentifier).join(",");
    const valueSql = columns.map(column => `json_extract(value, '$."${column}"')`).join(",");
    statements.push(env.DB.prepare(`DELETE FROM ${quoteIdentifier(table)}`));
    statements.push(env.DB.prepare(
      `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) SELECT ${valueSql} FROM json_each(?)`
    ).bind(JSON.stringify(rows)));
  }

  statements.push(env.DB.prepare("DELETE FROM store_settings WHERE id=1"));
  if (settingsRow) {
    statements.push(env.DB.prepare("INSERT INTO store_settings (id,data,updated_at) VALUES (1,?,?)")
      .bind(settingsRow.data, Number(settingsRow.updated_at)));
  }
  // Ephemeral checkout reservations and order-specific push subscriptions must
  // not survive a restore into a different order snapshot.
  statements.push(env.DB.prepare("DELETE FROM cart_stock_reservations"));
  statements.push(env.DB.prepare("DELETE FROM push_subscriptions"));

  try {
    // One D1 batch is a single transaction: either every live table is replaced,
    // or none of them is. Staging is unnecessary because each table's rows are
    // passed as one JSON parameter, not one SQL statement per record.
    await env.DB.batch(statements);
  } catch (error) {
    console.error("Atomic backup restore failed", error);
    return json({ error: "Restore could not be committed safely. The database transaction was rolled back; live data remains unchanged." }, 409);
  }

  const productsRestored = (backup.tables.products as any[]).length;
  const ordersRestored = (backup.tables.customer_orders as any[]).length;
  return json({ ok: true, productsRestored, ordersRestored, version: 2 });
};
