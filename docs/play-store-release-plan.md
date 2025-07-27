# Play Store Release Plan

This document outlines the steps required to transform the current soccer pre-game PWA into a polished, monetized app on the Google Play Store.

## 1. Finalize Supabase Integration
- Verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and other environment variables referenced in `README.md`.
- Ensure the configuration in `STORAGE_CONFIGURATION.md` is followed so Supabase is the sole provider.
- Complete the phases in `localstorage-deprecation-plan.md` so all users migrate away from localStorage.

## 2. Polish Remaining Features
- Implement the onboarding tour and contextual help tooltips listed in `TODO.md` and detailed in `onboarding-tour-plan.md`.
- Review components against `STYLE_GUIDE.md` for consistency, responsiveness and accessibility.

## 3. Strengthen Offline & Security Capabilities
- Finish the IndexedDB caching and background sync recommendations in `offline-requirements.md`.
- Implement the remaining tasks from `security-enhancement-plan.md`.

## 4. Clean Up & Prepare Production Build
- Remove or hide debug pages under `src/app`.
- Run the manual testing checklist in `MANUAL_TESTING.md` to catch regressions.
- Ensure `npm run lint` and `npm test` pass before building.

## 5. Package the PWA for Android
- Generate final icons and manifest with `scripts/generate-manifest.mjs`.
- Package the PWA using a Trusted Web Activity or similar method.
- Prepare Play Store assets: screenshots, short and full descriptions, and a privacy policy explaining Supabase data usage.

## 6. Monetization Strategy
- Decide on ads (e.g. Google AdMob) or subscriptions/in‑app purchases via Supabase Auth user accounts.
- Gate premium features such as advanced analytics or extra storage behind a subscription if desired.

## 7. Publish to Google Play
1. Create a Google Play Developer account.
2. Build a release APK or Android App Bundle from the production build.
3. Complete Play Console metadata, upload screenshots, and provide content ratings.
4. Submit for review and address feedback from Google.

---

### Ongoing
- Track bugs and enhancements in `docs/TODO.md`.
- Update `public/release-notes.json` and increment the version number for each release.
