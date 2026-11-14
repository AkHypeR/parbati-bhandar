# Parbati Bhandar — Owner Android app

This is a separate Android application for the store owner. It opens the existing secure owner portal at `/owner/dashboard` over HTTPS. Orders, inventory, settings, backup/restore and authentication remain on the existing Cloudflare Pages Functions and D1 database. The app does not contain an owner password or database secret.

## Build an installable APK

1. Install Node.js 22 and the EAS CLI: `npm install --global eas-cli`.
2. From this directory, run `npm install`.
3. Sign in to your Expo account: `eas login`.
4. Run `eas build:configure` once if EAS asks to link this app to an Expo project.
5. Build: `npm run build:apk`.
6. Download the APK from the EAS build page and install it on the owner's Android phone.

The `apk` profile creates an installable APK for direct distribution.

## Configuration

The production URL defaults to `https://parbati-bhandar.pages.dev`. To use a verified custom domain, set `EXPO_PUBLIC_STORE_ORIGIN` to that HTTPS origin before building. The app only keeps navigation inside that exact HTTPS host. WhatsApp, telephone and email links open through Android.

## Security and sessions

- The owner must sign in through the existing owner login screen.
- The WebView keeps its own website session; Chrome sign-in is not automatically shared.
- Keep the owner access key private and do not put it in app configuration or source.
- The app never connects directly to D1 and does not bypass the existing owner authorization checks.
