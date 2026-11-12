# Parbati Bhandar — Cloudflare migration

## Cloudflare Pages project
- GitHub repository: `AkHypeR/parbati-bhandar`
- Preview branch: `cloudflare-migration`
- Build command: `npm run build`
- Build output directory: `dist`
- Keep this as a preview until all tests pass. Do not replace the live production site yet.

## Required Cloudflare resources
1. Create a D1 database named `parbati-bhandar`.
2. In Pages → Settings → Functions → Bindings, add a D1 database binding named `DB` and select `parbati-bhandar`.
3. Apply `migrations/0001_initial.sql` to that D1 database using the D1 SQL console.
4. Add encrypted Pages secrets named `OWNER_PASSWORD` and `SESSION_SECRET`. Use a unique owner password of at least 16 characters and a separate random secret of at least 32 characters. Never commit either value.
5. Redeploy after configuring the D1 binding and secrets.

**No R2 bucket or image-storage binding is required.** Product photos, occasion banners and scanner pictures must use publicly accessible image URLs. The owner portal's image URL fields remain available; direct phone-to-site image uploads are disabled to avoid paid storage. You can still use the built-in grocery icons and the bundled Chhath reference artwork.

## Migration scope
- Owner sign-in is verified by a Pages Function and uses a signed HttpOnly, Secure, SameSite=Strict cookie with a 12-hour expiry.
- Catalogue and store settings are stored in D1.
- Static website assets are served through Cloudflare's CDN.
- The store's Google Maps link is configured through its saved Maps URL or address fallback.

## Before production
Test the public catalogue, product filtering, cart/WhatsApp order flow, owner login and logout, product create/edit/delete, stock updates, settings persistence, externally hosted image URLs, QR code and map link. Test on a mobile browser. Confirm that an unauthenticated request cannot modify products or settings.

Cloudflare free-tier quotas still apply; unlimited dynamic traffic is not guaranteed. Configure login rate limiting and monitor usage before public promotion.

## Security
Never place owner credentials in frontend code or GitHub. The D1 database is accessed only by the Pages Functions binding. Enable Cloudflare rate limiting for the login endpoint before public launch.
