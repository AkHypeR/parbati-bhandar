import "dotenv/config";
import { createServer } from "node:http";
import { parseConfig } from "./config.js";
import { createDatabase } from "./db.js";
import { createApp } from "./app.js";

let config;
try { config = parseConfig(); }
catch (error) {
  console.error(`Invalid API configuration: ${error.message}`);
  process.exit(1);
}

const pool = createDatabase(config);
const app = createApp({ pool, config });
const server = createServer(app);
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ level: "info", event: "api_shutdown", signal }));
  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();
  server.close(async () => {
    try { await pool.end(); process.exit(0); }
    catch (error) { console.error("API shutdown failed:", error.message); process.exit(1); }
  });
}

try {
  await pool.query("SELECT 1");
  server.listen(config.port, "0.0.0.0", () => {
    console.log(JSON.stringify({ level: "info", event: "api_started", port: config.port, environment: config.nodeEnv }));
  });
} catch (error) {
  console.error("API startup failed: PostgreSQL is not reachable.", error.message);
  await pool.end();
  process.exit(1);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
