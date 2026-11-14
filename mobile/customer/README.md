# Parbati Bhandar — Customer Android app

This is a separate Android application shell for customers. It loads the existing production storefront over HTTPS, so the website, Cloudflare Pages Functions and D1 database remain the single source of truth. It does not create a second catalogue, cart, account database or order system.

## Build an installable APK

1. Install Node.js 22 and the EAS CLI: `npm install --global eas-cli`.
2. From this directory, run `npm install`.
3. Sign in to your Expo account: `eas login`.
4. Run `eas build:configure` once if EAS asks to link this app to an Expo project.
5. Build: `npm run build:apk`.
6. Download the APK from the EAS build page and install it on an Android phone.

The `apk` profile explicitly creates an installable APK for direct distribution.

## Configuration

The production URL defaults to `https://parbati-bhandar.pages.dev`. To use a verified custom domain, set `EXPO_PUBLIC_STORE_ORIGIN` to that HTTPS origin before building. The app only keeps navigation inside that exact HTTPS host; external links such as WhatsApp, telephone and email links are handed to Android.

## Important

- Customer login, orders, pricing, inventory and settings continue to use the existing website/API.
- Android WebView maintains its own secure website session. Customers may need to sign in once in the app even if they are signed in on Chrome.
- Do not add API secrets, owner passwords or database credentials to this app.
- The APK is not yet built merely by committing this source. A linked Expo account is required to run the cloud build.
