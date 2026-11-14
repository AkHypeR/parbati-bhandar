# Parbati Bhandar — Cloudflare Pages

## Pages project
- Repository: `AkHypeR/parbati-bhandar`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Runtime: Cloudflare Pages Functions

## Cloudflare resources
1. Create or use the D1 database named `parbati-bhandar`.
2. Keep the existing D1 database binding named `DB` under the Cloudflare Pages project settings.
3. Apply `migrations/0001_initial.sql` to D1. Order tables and stock-deduction audit tables are created by the API when needed.
4. Customer account tables are bootstrapped idempotently by the Pages Functions on first account request. `migrations/0002_customer_accounts.sql` documents the schema for managed migration workflows; do not manually re-run it against a database where its tables/columns already exist.
6. Product and store images are uploaded to Cloudinary; no Supabase or R2 storage is required.

## Pages variables and secrets
Configure these under **Workers & Pages → parbati-bhandar → Settings → Variables and Secrets**:
- `OWNER_PASSWORD` — private owner access password.
- `SESSION_SECRET` — separate random signing secret (at least 32 characters).
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile secret for customer order submission.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — image upload credentials.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — optional web-push notifications.

Never commit real secrets or put them in browser-side Vite variables.

## Customer accounts
- Customers register and sign in using their name, 10-digit Indian mobile number and password.
- Passwords use PBKDF2-HMAC-SHA-256 with a unique random salt; plaintext passwords are never stored.
- Sessions use random opaque tokens in HttpOnly, Secure, SameSite cookies. Only SHA-256 token hashes are stored in D1.
- Sessions expire after 30 days. Customer order creation, tracking and history require a valid account session.
- Existing orders are linked to a new account by matching the phone number at registration.
- Checkout requires sign-in; the server takes the customer name and phone from the authenticated session, not browser-supplied values.

## Order and stock behaviour
- Customers view their own orders from the signed-in account. Order tracking is account-protected.
- The public catalogue exposes availability only; inventory counts are owner-only.
- The owner reviews an order, marks unavailable items, then confirms Ready.
- D1 applies stock deductions transactionally and only once per order.
- Products reaching zero stock are automatically marked unavailable in the public catalogue.

## Security
Owner login is handled by Cloudflare Pages Functions using a signed HttpOnly/Secure/SameSite session cookie. Configure rate limiting for the login endpoint before a wider public launch.
