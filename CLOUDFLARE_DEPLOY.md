# Parbati Bhandar — Cloudflare Pages

## Pages project
- Repository: `AkHypeR/parbati-bhandar`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Runtime: Cloudflare Pages Functions

## Cloudflare resources
1. Create or use the D1 database named `parbati-bhandar`.
2. Keep the D1 binding named `DB`; its database ID is recorded in `wrangler.toml`.
3. Apply `migrations/0001_initial.sql` to D1. Order tables and stock-deduction audit tables are created by the API when needed.
4. Product catalogue, customer orders and store settings are stored in D1.
5. Product and store images are uploaded to Cloudinary; no Supabase or R2 storage is required.

## Pages variables and secrets
Configure these under **Workers & Pages → parbati-bhandar → Settings → Variables and Secrets**:
- `OWNER_PASSWORD` — private owner access password.
- `SESSION_SECRET` — separate random signing secret (at least 32 characters).
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret for customer order submission.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — image upload credentials.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — optional web-push notifications.

Never commit real secrets or put them in browser-side Vite variables.

## Order and stock behaviour
- Customers track orders using order number + phone number.
- The public catalogue exposes availability only; inventory counts are owner-only.
- The owner reviews an order, marks unavailable items, then confirms Ready.
- D1 applies stock deductions transactionally and only once per order.
- Products reaching zero stock are automatically marked unavailable in the public catalogue.

## Security
Owner login is handled by Cloudflare Pages Functions using a signed HttpOnly/Secure/SameSite session cookie. Configure rate limiting for the login endpoint before a wider public launch.
