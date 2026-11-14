# Parbati Bhandar

Parbati Bhandar is a React + Vite grocery storefront with a separate owner portal and customer account experience.

## Current production architecture

- **Frontend:** React + TypeScript + Vite; build output: `dist/`.
- **API:** Cloudflare Pages Functions in `functions/api/`.
- **Database:** Cloudflare D1 through the `DB` binding; SQL migrations are in `migrations/`.
- **Images:** Cloudinary.
- **Customer and owner sessions:** secure server-managed cookies handled by Pages Functions.
- **Notifications:** customer inbox and optional Web Push.
- **Mobile:** Expo Android WebView apps use the same website and backend.

The active deployment instructions and required Cloudflare secrets are documented in [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md).

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Run the existing checks:

```bash
npm test
npm run lint
npm run build
```

The Vite development server does not by itself provide the Cloudflare Pages Functions runtime or a production D1 database. Use the Cloudflare Pages local-development workflow and a separate test D1 database when testing API routes. Never point local experiments at production data.

## API architecture roadmap

The current production API remains Cloudflare Pages Functions + D1. A staged migration to a modular Node.js API and PostgreSQL is being planned in [docs/PRODUCTION_BACKEND_MIGRATION.md](./docs/PRODUCTION_BACKEND_MIGRATION.md). Do not remove or bypass existing API routes until the replacement has passed data migration, security, inventory and rollback tests.

## Security

- Never commit production secrets, customer exports, or database backups.
- Keep service-role/database credentials server-side only.
- Test customer ownership and owner permissions on every protected endpoint.
- Take and verify a database backup before schema changes.
