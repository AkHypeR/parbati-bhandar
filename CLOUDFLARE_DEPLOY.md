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

## Pages Functions routing and request usage
- `public/_routes.json` is copied into the Pages build output. It limits Pages Functions execution to `/api/*`; ordinary storefront assets and client-side page routes are served as static assets.
- Keep API endpoints under `functions/api/`. If a future server-rendered route is added outside `/api/*`, update `public/_routes.json` deliberately and test it before deployment.
- After a production deploy, open the storefront and test catalogue, account, checkout, order tracking and owner portal. Confirm API calls still succeed and that normal page navigation works on refresh.

## Backups and recovery
- Export the production D1 database regularly and keep the export somewhere separate from this GitHub repository. Do not commit customer names, phone numbers, addresses, order records or database exports to Git.
- With Wrangler authenticated to the correct Cloudflare account, create an export before schema changes and on a regular schedule:
  `npx wrangler d1 export parbati-bhandar --remote --output=./parbati-bhandar-backup.sql`
- Store dated copies securely, restrict access, and periodically verify that an export is non-empty and can be imported into a separate test database. Never test a restore against the live production database.
- Before applying a migration, take a fresh export. Record the migration filename and deployment date alongside the backup.
- D1 point-in-time recovery and backup availability depend on the Cloudflare plan and account settings; check the database's Backups section in the Cloudflare dashboard rather than assuming it is enabled.

## Usage monitoring
- Check **Workers & Pages → parbati-bhandar → Metrics/Analytics** for Functions requests, errors and CPU usage after launch.
- Check **D1 → parbati-bhandar → Metrics** for rows read/written and storage. Review this after busy days and after changes to catalogue or order polling.
- Check the Cloudinary console's monthly credits, storage and bandwidth. Product images can become the first usage pressure point; resize/compress uploads and use appropriately sized thumbnails.
- Set a calendar reminder to review these dashboards weekly during the first month. Do not expose API keys or customer data in screenshots or support messages.

## Pre-launch security checks
- Add a Cloudflare rate-limiting rule for the owner login API path (the exact path used by the deployed owner login request) before public launch. Start with a conservative threshold, test legitimate owner sign-ins, and confirm the rule blocks repeated failures without locking out normal use. The application should also return a generic login error and must never reveal whether the password or account detail was correct.
- Verify that `OWNER_PASSWORD` and `SESSION_SECRET` are set as production secrets, are different, and are not present in Git history or browser-side bundles. Rotate them if they were ever pasted into source code or shared publicly.
- Test two simultaneous orders that request the same low-stock item. The available quantity must never become negative, and stock must be deducted only once if an order status is retried.
- Test customer A cannot read customer B's order by changing an order number or URL, and verify owner-only inventory endpoints reject unauthenticated requests.
- Keep a small real-order test checklist and verify confirmation, delayed/estimated preparation time, ready status, cancellation/refund handling (if enabled), and WhatsApp handoff on a phone before advertising the store.

