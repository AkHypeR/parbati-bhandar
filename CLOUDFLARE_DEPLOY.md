# Parbati Bhandar — Cloudflare migration

## Cloudflare Pages settings
- Repository: `AkHypeR/parbati-bhandar`
- Branch: `cloudflare-migration` (preview/test before production)
- Build command: `npm run build`
- Output directory: `dist`

## Required Cloudflare resources
1. Create a D1 database named `parbati-bhandar`; copy its database ID into `wrangler.toml`.
2. Create an R2 bucket named `parbati-bhandar-images`.
3. Apply `migrations/0001_initial.sql` to D1.
4. Bind D1 as `DB` and R2 as `IMAGES` in the Pages project.
5. Add encrypted Pages secrets `OWNER_PASSWORD` and `SESSION_SECRET`. Use a unique password of at least 16 characters and a separate random secret of at least 32 characters. Never commit secrets.
6. Deploy preview, test all flows, then connect the production domain.

## Migration scope
Owner authentication is verified in a Pages Function and uses a signed HttpOnly/Secure/SameSite cookie with a 12-hour expiry. Catalogue and settings are stored in D1. Product, banner and scanner images are stored in R2 and served through a cached Pages Function. Static assets use the Cloudflare CDN.

The existing Google Maps destination link is retained; verify it in the preview. Static requests and dynamic API requests have different plan limits. The app is designed to reduce backend calls, but no unlimited dynamic traffic is promised.

## Security
Never put owner credentials in frontend code or GitHub. D1 and R2 writes are available only to authenticated owner sessions. Configure rate limiting on the login endpoint before public launch.
