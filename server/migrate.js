import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseConfig } from "./config.js";
import { createDatabase } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const config = parseConfig();
const pool = createDatabase(config);
const LOCK_ID = 827364921;
const checksum = value => createHash("sha256").update(value).digest("hex");

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    lockAcquired = true;
    const files = (await readdir(path.join(here, "migrations")))
      .filter(name => /^\\d+_[a-z0-9_-]+\\.sql$/i.test(name)).sort();
    for (const filename of files) {
      const sql = await readFile(path.join(here, "migrations", filename), "utf8");
      const { rows } = await client.query("SELECT checksum FROM schema_migrations WHERE filename=$1", [filename]);
      const digest = checksum(sql);
      if (rows.length) {
        if (rows[0].checksum !== digest) throw new Error(`Applied migration was modified: ${filename}`);
        console.log(`Already applied: ${filename}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(filename,checksum) VALUES($1,$2)", [filename, digest]);
        await client.query("COMMIT");
        console.log(`Applied: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try { if (lockAcquired) await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]); }
    finally { client.release(); }
  }
  console.log("PostgreSQL migrations are up to date.");
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
