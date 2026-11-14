# Production backend migration — Node.js

## Status

**Phase 1 foundation implemented in a separate, non-production Node.js service.** The current live API remains Cloudflare Pages Functions + D1. No production routes or data have been switched.

## Current production architecture

- React + Vite storefront; Cloudflare Pages Functions under `functions/api/`.
- Cloudflare D1 through the `DB` binding; several order/account tables are also upgraded idempotently at runtime.
- Cloudinary images, customer/owner HttpOnly sessions, customer inbox and optional Web Push.
- Both Expo Android apps use the same existing website/backend.
- The Node API is a separate staging service, not a production replacement.

## Target architecture

Use a modular Node.js service (modular monolith, not microservices):
- Node.js 22 LTS, Express 4 (reusing the existing dependency).
- PostgreSQL with explicit versioned SQL migrations.
- `pg` connection pool with parameterised queries.
- Strict request validation before any domain API is exposed.
- Secure HttpOnly sessions, CSRF protection for cookie-authenticated mutations, login rate limits.
- Structured logs, request IDs, safe errors, health/readiness endpoints.
- Cloudinary retained for media.
- Redis/queues added only when measured background-job requirements justify them.

## Phase 1 implementation

The isolated service lives in `server/`:
- `config.js`: validates PostgreSQL URL, port, exact CORS allowlist and production TLS.
- `db.js`: bounded PostgreSQL connection pool and timeouts.
- `app.js`: request IDs, structured request logs, security headers, strict CORS, 1 MB JSON limit, live/readiness checks, safe 404/error responses.
- `index.js`: startup DB check and graceful SIGTERM/SIGINT shutdown.
- `migrate.js`: ordered SQL migrations, transaction boundaries, PostgreSQL advisory lock and SHA-256 migration checksums.
- `migrations/`: migration ledger and idempotency-key foundation table; does not import or modify D1.
- `Dockerfile`: portable Node 22 container.
- Commands: `npm run dev:api`, `npm run start:api`, `npm run migrate:api`.
- Node built-in tests validate configuration safety.

Only `/health/live` and `/health/ready` are exposed. Catalogue, customer, owner, order and inventory endpoints are intentionally not exposed yet. This prevents a second inventory writer before data migration and transaction parity are complete.

## Non-negotiable data and behaviour invariants

1. One authoritative inventory writer only. Old and new order APIs must never write stock simultaneously.
2. Order creation, stock deduction, cancellation/refund and edits must be transactional and idempotent.
3. Customers may access only their own accounts, carts, inboxes and orders. Owner routes remain owner-protected.
4. Verify prices, product IDs, availability, customer identity and totals server-side.
5. Payment status must come from verified provider webhooks/signatures, not browser success screens.
6. Preserve order history, order numbers, accounts, inbox, push subscriptions, catalogue, settings and backup/restore.
7. Never commit credentials, customer exports or database dumps.
8. Keep Cloudflare as rollback target until the replacement is verified.

## Migration phases

### Phase 0 — Audit and baseline (partially complete)
- Inventory API routes, environment bindings, schema and external integrations.
- Establish repeatable build, type-check and integration tests.
- Convert runtime-created D1 schema into reviewed PostgreSQL migrations.

### Phase 1 — Node service foundation (implemented; staging deployment pending)
- Separate Node API, configuration validation, request IDs, safe errors, health/readiness and graceful shutdown.
- PostgreSQL pool and migration runner.
- CI tests.
- Staging deploy only.

### Phase 2 — Data migration (not started)
- Export D1 from the correct production account and verify it.
- Create separate PostgreSQL staging database.
- Map every D1 table and JSON-backed product/settings record.
- Compare row counts, order totals/statuses, stock quantities, customer IDs and notification records.
- Test restore to a fresh database. Never test against production.

### Phase 3 — Domain migration (not started)
1. Catalogue/settings reads.
2. Owner authentication and product/settings writes.
3. Customer authentication/profile.
4. Carts and reservations.
5. Order placement and stock deductions.
6. Tracking, edits, cancellation and refunds.
7. Inbox and Web Push.
8. Uploads, backups and owner reporting.

Each domain requires contract tests, ownership/permission tests and rollback checks.

### Phase 4 — Staging and cutover (not started)
- Test concurrent low-stock checkouts, duplicate requests, cancellation/refund, edits, push delivery, session expiry and backup restore.
- Freeze writes briefly for final sync.
- Switch all clients together so inventory has exactly one writer.
- Keep the old D1 database untouched as rollback until stable.

### Phase 5 — Operate and optimise (not started)
- Monitor errors, latency, DB connections and resource usage.
- Add caching/Redis only when measurements justify it.
- Schedule backups and perform restore drills.

## Existing Cloudflare API inventory

- Catalogue/settings: `GET /api/catalog`, `GET/PUT /api/settings`
- Owner auth: `/api/auth/login`, `/api/auth/logout`
- Customer auth: `/api/customer-auth/register`, `login`, `logout`, `me`
- Products/media: `PUT/DELETE /api/products`, `POST /api/upload`
- Orders: `POST /api/orders`, `/api/orders/*`, `POST /api/orders/manage`
- Cart reservations: `POST/DELETE /api/cart-reservations`
- Customer cart: `/api/customer-cart`
- Inbox/preferences: `/api/customer-inbox`, `/api/customer-notifications`, `GET /api/push-key`
- Owner broadcasts: `POST /api/owner-notifications`
- Backup/restore: `/api/backup`

This list is based on repository inspection, not a live API probe.

## Infrastructure and access boundary

A managed Node host, separate PostgreSQL instance, secrets and staging hostname are required. The repository contains no credentials or authorised account connection for provisioning these. Do not point the Node service at production or switch clients until a separate staging database exists and data migration is verified.
