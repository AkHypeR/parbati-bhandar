import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "./config.js";

const base = { DATABASE_URL: "postgresql://user:password@localhost:5432/parbati_test" };

test("accepts a valid local PostgreSQL configuration", () => {
  const config = parseConfig(base);
  assert.equal(config.port, 8080);
  assert.equal(config.databaseSsl, false);
  assert.deepEqual(config.allowedOrigins, ["http://localhost:3000", "http://localhost:5173"]);
});

test("requires a PostgreSQL URL", () => {
  assert.throws(() => parseConfig({ DATABASE_URL: "mysql://localhost/db" }), /postgres/);
});

test("requires a database URL", () => {
  assert.throws(() => parseConfig({}), /DATABASE_URL is required/);
});

test("requires TLS for production database connections", () => {
  assert.throws(() => parseConfig({ ...base, NODE_ENV: "production", DATABASE_SSL: "false" }), /cannot be disabled/);
  assert.equal(parseConfig({ ...base, NODE_ENV: "production" }).databaseSsl, true);
});

test("rejects wildcard CORS origins", () => {
  assert.throws(() => parseConfig({ ...base, CORS_ORIGINS: "*" }), /wildcard/);
});

test("requires exact origins without paths", () => {
  assert.throws(() => parseConfig({ ...base, CORS_ORIGINS: "https://store.example.com/path" }), /exact/);
});

test("rejects invalid ports", () => {
  assert.throws(() => parseConfig({ ...base, PORT: "70000" }), /PORT/);
});
