<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f4ab383b-c7d3-4188-b70b-36298ffa6fb8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Parbati Bhandar — Supabase + Netlify

This project is connected to the Parbati Bhandar Supabase project. The browser uses only the public publishable key; product and settings writes are protected by the database RLS policies and the `private.store_admins` membership check.

### Owner login
Open the owner portal from the shop logo / `?admin=1`, then sign in with the authorised owner account:
- `7001.akashroy@gmail.com`
- Use the password set for that Supabase Auth account (never put it in source code).

The previous client-side PIN (`1234`) has been removed. Do not restore it.

### Cloud data
- `products`: shared catalogue, stock, pricing, variants and hero item order.
- `store_settings`: shared store settings. The legacy `ownerPin` property is deliberately omitted.
- `product-images` Storage bucket: product and store images. Uploads are limited to the bucket's configured 2 MB limit.

The shopping cart remains local to each customer's browser. WhatsApp ordering remains unchanged.

### Deploy on Netlify
1. Push this folder to a GitHub repository.
2. In Netlify choose **Add new site → Import an existing project** and select the repository.
3. Build command: `npm run build`; publish directory: `dist`.
4. Deploy. The Supabase URL and public publishable key are already configured in `src/lib/supabase.ts`.
5. In Supabase Authentication → URL Configuration, add your deployed Netlify URL to the allowed redirect URLs if you later enable OAuth.

Never expose a Supabase `service_role` or secret key in frontend environment variables.

<!-- Cloudflare Pages deployment refresh: 2026-11-13 -->
