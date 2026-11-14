# Production backend migration — Node.js

## Status

This is the approved migration blueprint. The production API is **not yet migrated**. The current production-compatible implementation remains Cloudflare Pages Functions + Cloudflare D1. Keep it live until the replacement has passed the cutover checklist below.

## What the repository actually runs today

- The storefront is React + Vite and is built to `dist/`.
- API routes live under `functions/api/` and use the Cloudflare Pages Functions request-handler contract.
- Runtime data is stored in Cloudflare D1 through the `DB` binding. The schema is documented in `migrations/`; some order/account tables are also upgraded idempotently by runtime helpers.
- Images are uploaded to Cloudinary.
- Customer and owner sessions are implemented in the Pages Functions layer using HttpOnly cookies.
- Web Push is sent by the existing notification functions.
- The production deployment guide identifies Cloudflare Pages as the production host. The older README text mentioning Supabase/Netlify was stale and has been corrected.
- `express` and `dotenv` are already listed in package dependencies, but the repository currently has no Node API entry point or `start` script. Their presence alone does not mean a Node server is running.

## Target production architecture

Use a **modular Node.js + TypeScript API**, initially as a single deployable service (a modular monolith), not microservices.

- Runtime: supported Node.js LTS
- HTTP: Fastify (preferred for a new service) or Express if the existing dependency is deliberately retained
- Database: PostgreSQL, with explicit versioned SQL migrations
- Data access: one repository/data-access layer; parameterised queries only
- Validation: schemas at every request boundary
- Authentication: secure HttpOnly cookies, hashed opaque session tokens, CSRF protection for cookie-authenticated mutations, rate limits for login and sensitive endpoints
- Background work: durable queue only when asynchronous tasks justify it (push fan-out, scheduled cleanup, exports); do not add Redis before a measured need
- Observability: structured logs with request IDs, health/readiness checks, error monitoring, and database/latency metrics
- Media: keep Cloudinary initially
- Frontends: keep the current React website and both Expo WebView apps; change only their API base URL at the final cutover

## Non-negotiable data and behaviour invariants

1. There must be one authoritative inventory writer. Never run old and new order APIs as simultaneous writers against the same stock.
2. Order creation, stock deduction, cancellation/refund, and order edits must be transactional and idempotent.
3. A customer can access only their own account, cart, inbox, and orders. Owner-only routes must remain owner protected.
4. Prices, product IDs, availability, customer identity, and order totals must be verified server-side; never trust client-supplied totals or identity.
5. Payment verification (if/when enabled) must be based on a verified provider webhook/signature, not a browser success screen.
6. Preserve order history, order numbers, customer accounts, notification inbox, push subscriptions, product catalogue, store settings, and backup/restore capability.
7. Never put production credentials, customer exports, or database dumps in Git.
8. The existing Cloudflare API stays available as the rollback target until the new backend is verified.

## Migration phases

### Phase 0 — Audit and baseline (in progress)
- Inventory every API route, environment binding, database table, migration and external integration.
- Record current production host and deployment workflow.
- Establish repeatable build, type-check and API integration tests.
- Identify any schema created dynamically at runtime and turn it into explicit migration steps before moving databases.

### Phase 1 — Node service foundation
- Add a separate Node API workspace without changing the current Pages routes.
- Add configuration validation, request IDs, structured logging, safe error responses, health/readiness endpoints and graceful shutdown.
- Add PostgreSQL connection pooling and migration runner.
- Add CI checks for the Node service.
- Deploy only to a staging environment first.

### Phase 2 — Data migration
- Export D1 from the correct production account and verify the export.
- Create a separate PostgreSQL staging database.
- Map and migrate every table and JSON-backed product/settings record.
- Compare row counts, totals, order status distributions, stock quantities, customer IDs and notification records.
- Test a restore into a fresh database. Do not write to production during this phase.

### Phase 3 — Domain API migration
Migrate one domain at a time behind the existing frontend contract:
1. public catalogue and settings reads;
2. owner authentication and product/settings writes;
3. customer authentication and account profile;
4. carts and reservations;
5. order placement and stock deductions;
6. order tracking, edit, cancellation and refunds;
7. customer inbox and Web Push;
8. uploads, backups and owner reporting.

Each domain needs contract tests and permission tests before it is switched.

### Phase 4 — Staging and production cutover
- Run end-to-end tests against staging using separate test accounts and products.
- Test concurrent low-stock checkouts, duplicate requests, cancellation/refund, order edits, notification fan-out, session expiry and backup restore.
- Freeze writes briefly for the final data sync.
- Switch all clients to the Node API together so inventory has exactly one writer.
- Keep a documented rollback switch and the old D1 database untouched until the new service is stable.

### Phase 5 — Operate and optimise
- Monitor errors, latency, database connections, queue depth and resource usage.
- Add caching/Redis only where measurements justify it.
- Schedule and verify database backups and restore drills.
- Review security and dependency updates regularly.

## Current API inventory

The Pages Functions API currently includes:

- Catalogue and settings: `GET /api/catalog`, `GET/PUT /api/settings`
- Owner authentication: `/api/auth/login`, `/api/auth/logout`
- Customer authentication: `/api/customer-auth/register`, `login`, `logout`, `me`
- Products and media: `PUT/DELETE /api/products`, `POST /api/upload`
- Orders: `POST /api/orders`, order tracking/history routes under `/api/orders/*`, and `POST /api/orders/manage`
- Cart stock holds: `POST/DELETE /api/cart-reservations`
- Customer cart: `/api/customer-cart`
- Customer inbox and push preferences: `/api/customer-inbox`, `/api/customer-notifications`, `GET /api/push-key`
- Owner broadcasts: `POST /api/owner-notifications`
- Backup/restore: `/api/backup`

The route inventory must be reconciled against the live deployment before migration; this list is based on the current repository tree, not a live API probe.

## Infrastructure / access boundary

A Node backend cannot become production merely by adding files to GitHub. A production Node host, PostgreSQL instance, environment secrets, domain/API routing and backup destination must exist. Provisioning or connecting these requires authorised access to the relevant hosting/database accounts. Until those are available, keep the current production API unchanged. Do not silently substitute a new database or deploy a half-configured API.
