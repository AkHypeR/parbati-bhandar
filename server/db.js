import pg from "pg";

const { Pool } = pg;

export function createDatabase(config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.pgPoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    application_name: "parbati-bhandar-api",
    ...(config.databaseSsl ? { ssl: { rejectUnauthorized: config.databaseSslRejectUnauthorized } } : {}),
  });

  pool.on("error", error => {
    console.error(JSON.stringify({ level: "error", event: "postgres_idle_client_error", message: error.message }));
  });
  return pool;
}
