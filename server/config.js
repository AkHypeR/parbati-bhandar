const DEFAULT_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

function parseBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export function parseConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const databaseUrl = env.DATABASE_URL;
  if (typeof databaseUrl !== "string" || !databaseUrl.trim()) {
    throw new Error("DATABASE_URL is required by the Node API.");
  }
  let parsedDatabaseUrl;
  try { parsedDatabaseUrl = new URL(databaseUrl); }
  catch { throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL."); }
  if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }

  const configuredOrigins = (env.CORS_ORIGINS || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const allowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : nodeEnv === "production" ? [] : DEFAULT_DEV_ORIGINS;
  if (allowedOrigins.includes("*")) {
    throw new Error("CORS_ORIGINS cannot contain a wildcard. List exact trusted origins.");
  }
  for (const origin of allowedOrigins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error("CORS_ORIGINS contains an invalid origin."); }
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error("CORS_ORIGINS entries must be exact http(s) origins without paths.");
    }
  }

  const databaseSsl = parseBoolean(env.DATABASE_SSL, nodeEnv === "production");
  if (nodeEnv === "production" && !databaseSsl) {
    throw new Error("DATABASE_SSL cannot be disabled in production.");
  }

  return Object.freeze({
    nodeEnv,
    port,
    databaseUrl,
    databaseSsl,
    databaseSslRejectUnauthorized: parseBoolean(env.DATABASE_SSL_REJECT_UNAUTHORIZED, true),
    allowedOrigins: Object.freeze(allowedOrigins),
    trustProxy: parseBoolean(env.TRUST_PROXY, nodeEnv === "production"),
    logLevel: env.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug"),
  });
}
