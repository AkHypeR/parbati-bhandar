import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "./app.js";

async function withServer(pool, config, run) {
  const server = createServer(createApp({ pool, config }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

const config = { trustProxy: false, allowedOrigins: ["https://store.example.com"] };

test("live health check does not depend on the database", async () => {
  await withServer({ query: async () => { throw new Error("database down"); } }, config, async base => {
    const response = await fetch(base + "/health/live");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
    assert.ok(response.headers.get("x-request-id"));
    assert.equal(response.headers.get("x-powered-by"), null);
  });
});

test("readiness health check verifies database connectivity", async () => {
  await withServer({ query: async () => ({ rows: [{ result: 1 }] }) }, config, async base => {
    const response = await fetch(base + "/health/ready");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ready", database: "connected" });
  });
});

test("readiness returns unavailable when PostgreSQL is down", async () => {
  await withServer({ query: async () => { throw new Error("database down"); } }, config, async base => {
    const response = await fetch(base + "/health/ready");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "not_ready", database: "unavailable" });
  });
});

test("rejects untrusted browser origins", async () => {
  await withServer({ query: async () => ({ rows: [] }) }, config, async base => {
    const response = await fetch(base + "/health/live", { headers: { Origin: "https://attacker.example" } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });
});

test("returns a safe JSON 404 for routes not migrated yet", async () => {
  await withServer({ query: async () => ({ rows: [] }) }, config, async base => {
    const response = await fetch(base + "/api/catalog");
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "API route not found.");
  });
});
