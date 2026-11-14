# Parbati Bhandar

Parbati Bhandar is a React + Vite grocery storefront with a separate owner portal and customer account experience.

## Current production architecture

- **Frontend:** React + TypeScript + Vite; build output: `dist/`.
- **Production API:** Cloudflare Pages Functions in `functions/api/`.
- **Production database:** Cloudflare D1 through the `DB` binding.
- **Images:** Cloudinary.
- **Customer and owner sessions:** secure server-managed cookies handled by Pages Functions.
- **Notifications:** customer inbox and optional Web Push.
- **Mobile:** Expo Android WebView apps use the same website and backend.

The active Cloudflare deployment instructions and required secrets are documented in [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md).

## Node.js API foundation (staging only)

A separate Node.js + Express API foundation is being built in `server/` with PostgreSQL. It is not connected to production traffic and currently exposes health/readiness endpoints only.

Requirements: Node.js 22+ and a separate PostgreSQL database.

```bash
npm install
cp .env.example .env
# Set DATABASE_URL to a local or staging PostgreSQL database.
npm run migrate:api
npm run dev:api
```

Health checks:
- `GET /health/live`
- `GET /health/ready`

For a production container build, use the included `Dockerfile`. Configure `DATABASE_URL`, `NODE_ENV=production`, `DATABASE_SSL=true`, and an explicit comma-separated `CORS_ORIGINS` allowlist. Do not deploy without a separate staging database and a verified backup/restore process.

## Frontend development

```bash
npm run dev
npm test
npm run build
```

The Vite development server does not provide the Cloudflare Pages Functions runtime or a production D1 database. Use a separate test D1 database for the existing Pages API.

## Production migration safety

The current Cloudflare backend remains the only production API and inventory writer. The Node service must not receive customer/order traffic until authentication, data migration, inventory transactions, notification delivery, contract tests and rollback have all been verified. See [docs/PRODUCTION_BACKEND_MIGRATION.md](./docs/PRODUCTION_BACKEND_MIGRATION.md).

## Security

- Never commit production secrets, customer exports, or database backups.
- Keep database credentials server-side only.
- Test customer ownership and owner permissions on every protected endpoint.
- Take and verify a database backup before schema changes.
