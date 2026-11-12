# Cloudflare Pages migration

## Frontend deployment

This is a Vite + React application. Cloudflare Pages can build it directly from the GitHub repository.

- Production branch: `cloudflare-migration` (review and merge when ready)
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: 22 or newer

The repository includes `wrangler.toml` and `public/_redirects` for the Pages build and single-page-app routing.

## Important backend migration status

The storefront currently contains integrations for Supabase Auth, database tables, and the `product-images` Storage bucket. Cloudflare Pages hosting does not replace those services. The previous Supabase project was deleted, so the existing owner login, product/inventory persistence, settings, and image uploads will not work until they are migrated and the app code is updated.

Do not put an owner password, database secret, or service credential in frontend code. A password-only owner page must verify credentials on a server-side Worker and use a secure session; hiding an admin page with a client-side password is not secure.

## Recommended Cloudflare backend

- Workers: authenticated API endpoints and server-side owner session handling.
- D1: products, inventory, store settings, and orders metadata.
- R2: product and store image objects.
- Turnstile/rate limiting: abuse protection where appropriate.

Before switching the live domain, complete the backend migration and test storefront, owner access, CRUD, image uploads, and map behavior.
