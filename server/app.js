import express from "express";
import { randomUUID } from "node:crypto";

export function createApp({ pool, config }) {
  if (!pool || !config) throw new Error("API app requires a database pool and validated config.");
  const app = express();
  if (config.trustProxy) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const requestId = randomUUID();
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("cache-control", "no-store");
    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.log(JSON.stringify({
        level: "info", event: "http_request", requestId,
        method: req.method, path: req.path, status: res.statusCode,
        durationMs: Math.round(elapsedMs * 100) / 100,
      }));
    });
    next();
  });

  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (!origin) return next();
    if (!config.allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: "Origin is not allowed.", requestId: res.getHeader("x-request-id") });
    }
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("access-control-allow-headers", "Content-Type, X-CSRF-Token, Idempotency-Key, X-Request-ID");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  app.use(express.json({ limit: "1mb", strict: true }));
  app.get("/health/live", (_req, res) => res.status(200).json({ status: "ok" }));
  app.get("/health/ready", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      return res.status(200).json({ status: "ready", database: "connected" });
    } catch {
      return res.status(503).json({ status: "not_ready", database: "unavailable" });
    }
  });

  app.use((_req, res) => res.status(404).json({
    error: "API route not found.", requestId: res.getHeader("x-request-id"),
  }));
  app.use((error, _req, res, _next) => {
    const status = error?.type === "entity.too.large" ? 413
      : error instanceof SyntaxError && "body" in error ? 400 : 500;
    if (status === 500) console.error(JSON.stringify({
      level: "error", event: "unhandled_api_error",
      requestId: res.getHeader("x-request-id"), message: error?.message || "Unknown error",
    }));
    return res.status(status).json({
      error: status === 413 ? "Request body is too large."
        : status === 400 ? "Request body contains invalid JSON."
        : "An unexpected server error occurred.",
      requestId: res.getHeader("x-request-id"),
    });
  });
  return app;
}
