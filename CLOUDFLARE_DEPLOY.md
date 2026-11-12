# Parbati Bhandar — Cloudflare migration

## Cloudflare Pages project
- GitHub repository: `AkHypeR/parbati-bhandar`
- Production branch for initial preview: `cloudflare-migration`
- Build command: `npm run build`
- Build output directory: `dist`
- Deploy the branch as a preview first. Do not replace the existing production site until all tests pass.

## Create Cloudflare resources and bind them
1. In Cloudflare, create a D1 database named `parbati-bhandar`.
2. In Cloudflare, create an R2 bucket named `parbati-bhandar-images`.
3. In the Pages project, open Settings → Functions → Bindings (the exact menu wording may vary).
4. Add a D1 database binding named `DB` and select `parbati-bhandar`.
5. Add an R2 bucket binding named `IMAGES` and select `parbati-bhandar-images`.
6. Apply `migrations/0001_initial.sql` to the D1 database using the Cloudflare D1 console or Wrangler.
7. Add encrypted Pages environment variables/secrets named `OWNER_PASSWORD` and `SESSION_SECRET`. Use a unique owner password of at least 16 characters and a separate random secret of at least 32 characters. Never commit either value.
8. Redeploy after configuring bindings and secrets.

The D1 database ID does not need to be placed in this repository's `wrangler.toml` when bindings are configured directly in the Pages dashboard.

## Migration scope
- Owner sign-in is verified by a Pages Function and uses a signed HttpOnly, Secure, SameSite=Strict cookie with a 12-hour expiry.
- Catalogue and store settings are stored in D1.
- Product, banner and scanner images are stored in R2 and served through a Pages Function route.
- Static website assets are served through Cloudflare's CDN.
- The existing Google Maps destination URL is retained; verify the map link in the preview.

## Before production
Test the public catalogue, product filtering, cart/WhatsApp order flow, owner login and logout, product create/edit/delete, stock updates, settings persistence, image uploads, QR code and map link. Test on a mobile browser. Confirm that an unauthenticated request cannot modify products, settings or upload images.

Static asset requests and dynamic API requests have different plan limits. The application reduces backend reads with a short public catalogue cache, but free-tier quotas still apply and unlimited dynamic traffic is not guaranteed. Configure login rate limiting and monitor usage before public promotion.

## Security
Never place owner credentials in frontend code or GitHub. Do not make the R2 bucket public; image reads go through the application route. The D1 database is accessed only by the Pages Functions binding. The current login endpoint should have Cloudflare rate limiting enabled before public launch.
