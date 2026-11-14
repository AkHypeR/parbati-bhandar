# Parbati Bhandar

Parbati Bhandar is a React + TypeScript grocery storefront with a separate owner portal and customer account experience.

## Production architecture — selected for a zero-hosting-cost target

- **Frontend:** React + Vite on Cloudflare Pages.
- **API:** Cloudflare Pages Functions in `functions/api/` (Cloudflare Workers runtime).
- **Database:** Cloudflare D1 through the `DB` binding.
- **Images:** Cloudinary.
- **Sessions:** server-managed HttpOnly cookies.
- **Notifications:** customer inbox and optional Web Push.
- **Android apps:** Expo WebView shells use the same website and API.

**We are not deploying a separate Express server or PostgreSQL database.** Cloudflare Pages Functions already provide server-side JavaScript/TypeScript API handling. Cloudflare's Workers runtime supports a documented subset of Node.js APIs, so Node-compatible code can be used where it is supported. A traditional always-running Node server would add hosting and database costs and a second inventory system to maintain.

This is the chosen architecture for the current target of around 100 customer visits/orders per day. It is a capacity target, not a guaranteed SLA; actual usage must be monitored.

### Current free-plan reference limits

Cloudflare currently documents:
- Workers / Pages Functions: 100,000 requests per day on the Free plan.
- D1: 5 million rows read per day, 100,000 rows written per day, and 5 GB total storage on the Free plan.

These are account-wide quotas and reset daily where applicable. If the account shares these resources with other projects, the remaining quota is lower. Hitting a daily D1 limit can cause API queries to fail until the reset. See the official [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing and limits](https://developers.cloudflare.com/d1/platform/pricing/).

### Operating rules

1. Keep one production inventory writer: the existing Cloudflare API.
2. Keep images on Cloudinary; avoid putting product photos into D1.
3. Cache public static assets through Cloudflare Pages/CDN; do not cache account, order, cart, or owner responses publicly.
4. Keep D1 queries indexed and bounded; avoid full-table scans for customer/order lookups.
5. Monitor Workers requests and D1 row reads/writes/storage before approaching free quotas.
6. Keep backups and test restoration before schema changes.
7. Do not enable paid Cloudflare features or create paid infrastructure without explicit approval.

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

The Pages Functions API needs the Cloudflare runtime and D1 bindings to be tested end-to-end; a plain Vite dev server does not emulate production bindings.

## Separate Node.js prototype

The `server/` directory is an isolated Express + PostgreSQL prototype from an earlier architecture exploration. It exposes only health/readiness endpoints and is **not deployed, not connected to production, and not required for the free production architecture**. Do not point it at production data.

## Security

- Never commit production secrets, customer exports, or database backups.
- Keep database credentials server-side only.
- Enforce customer ownership and owner permissions on every protected endpoint.
- Verify prices, stock, and order totals on the server.
- Keep order creation, stock deduction, cancellation and refunds atomic and idempotent.
