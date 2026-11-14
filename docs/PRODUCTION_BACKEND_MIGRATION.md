# Parbati Bhandar — production backend architecture

## Decision

**Use Cloudflare Pages + Pages Functions + D1 as the production API and database. Target spend: ₹0 in additional hosting/database fees, subject to staying within the existing Cloudflare Free and other provider free allowances.**

Do not deploy a separate always-on Express server or provision another PostgreSQL database for the current scale target of approximately 100 customer visits/orders per day. It would add operational complexity, create a second source of truth for stock, and likely require paid hosting for reliable always-on service.

## Why this is the right fit

- The storefront and current API are already deployed together on Cloudflare Pages.
- Pages Functions run on Cloudflare's Workers runtime, which supports a documented subset of Node.js APIs.
- The existing D1 database is already the authoritative product/order/inventory store.
- The free Workers allowance currently lists 100,000 requests/day.
- The D1 free allowance currently lists 5 million rows read/day, 100,000 rows written/day and 5 GB total storage.
- Static site asset requests are served separately from Functions requests and do not consume the Functions request allowance.
- No second database migration, customer-data export, new server credentials, or inventory cutover is required.

These are published plan quotas, not a guarantee of throughput or uptime. They are account-wide. The site can exceed them if query patterns are inefficient or other projects consume the same allowance. D1 daily quota exhaustion can cause database queries to fail until the reset. Check the current official limits before making future architecture decisions:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Current production data flow

`Customer / Owner / Android WebView`
→ `Cloudflare Pages CDN`
→ `Pages Functions API (functions/api/*)`
→ `Cloudflare D1 (DB binding)`

Cloudinary remains the product-image provider. Customer inbox and Web Push remain on the existing notification routes. The existing Cloudflare API is the only inventory writer.

## Node.js requirement

The current Pages Functions are server-side JavaScript/TypeScript running in Cloudflare's Worker runtime, not a traditional long-running Node process. Cloudflare documents Node.js API compatibility for supported built-in APIs. Use those supported Node APIs only when needed; continue using Cloudflare bindings such as `env.DB` for D1. Do not try to run Express or the PostgreSQL `pg` driver inside the Pages Functions runtime as a drop-in replacement.

A separate Express + PostgreSQL prototype exists under `server/` from the prior exploration. It exposes only health/readiness endpoints. It is not deployed and must remain disconnected from production. It is not part of the selected free architecture.

## Capacity and cost guardrails

For approximately 100 daily customers, this is a sensible starting architecture if API usage and database scans stay within free quotas. The real limit is not simply number of customers; it is the number of Function requests and D1 rows read/written per day.

- Keep public catalogue queries bounded and indexed.
- Use indexed lookups for customer phone/session, customer_id, order id/status and reservation expiry/product id.
- Avoid repeated schema creation or table scans in hot request paths; move schema setup to reviewed migrations where safe.
- Avoid polling more frequently than necessary.
- Use bounded result sets and pagination for order history and owner lists.
- Cache static files and images; never publicly cache private account/order responses.
- Do not store product images in D1.
- Track Workers requests, D1 row reads/writes and database size.
- If free limits are approached, optimize first. Do not silently upgrade or enable billing.

## Reliability and safety rules

1. Exactly one inventory writer in production.
2. Checkout validates live catalogue prices, product IDs, stock and customer identity server-side.
3. Stock deduction, cancellation/refund and order edits must be atomic and idempotent.
4. Customers can read/change only their own records; owner APIs remain owner-protected.
5. Payment state must be based on verified payment-provider callbacks if payment integration is added.
6. Backups must be created and restore-tested before risky schema changes.
7. Never use the unused PostgreSQL prototype against production D1 data.
8. Do not introduce Redis, queues, a second database or microservices until measured need justifies the cost and complexity.

## Next engineering priorities

1. Audit hot D1 queries and add appropriate indexes through safe, versioned migrations.
2. Add pagination to customer order history and owner order lists if missing.
3. Add request-level rate limiting for login and other abuse-sensitive endpoints using Cloudflare-native facilities.
4. Add tests for concurrent checkout, stock contention, cancellation/refund, order edits and customer ownership.
5. Add lightweight operational checks for Workers/D1 quota usage and backup restore readiness.

## Existing API route inventory

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
