# Project Blueprint

A reproducible template for new projects using the identical setup and operational patterns as MatchDay Coach. Copy this file into a fresh repo and follow it top‑to‑bottom.

## 1) Purpose and Scope
- Deliver a production‑ready PWA with the same stack, patterns, and ops behaviors.
- Optional/plug‑and‑play modules: Supabase, Sentry, Vercel Analytics.

## 2) Tech Stack (pinned)
- Framework: Next.js 15.3.5 (App Router)
- Language: TypeScript 5
- UI: React 19.0.0, Tailwind CSS 4
- State: Zustand 5.0.3 (app state), React Query 5.80.10 (server state)
- Data: Supabase 2.52.0 (Auth + PostgREST), IndexedDB (offline cache), localStorage (fallback)
- PWA: Custom Service Worker (app shell + data cache)
- i18n: i18next 24.2.3, react‑i18next 15.4.1
- Charts: Recharts 2.15.4
- Validation: Zod 3.25.76
- Analytics/Monitoring: @vercel/analytics 1.5.0 (optional), Sentry (@sentry/nextjs)
- Testing: Jest 29.7.0 + React Testing Library

## 3) Repository Layout
```
/ (root)
  README.md
  PROJECT_BLUEPRINT.md
  .env.example
  public/
    sw.js
    manifest.json
    icons/ (pwa icons)
  src/
    app/        (App Router entrypoints, layout, providers)
    components/ (UI + modals)
    hooks/      (business hooks)
    lib/        (storage, security, offline, monitoring)
    stores/     (Zustand)
    utils/      (shared helpers)
    types/      (domain types)
  docs/         (ops, production, performance, monitoring)
  scripts/      (manifest, release notes, bundle analysis)
```

## 4) Environment Setup
- Node: LTS (latest) and npm/pnpm
- Copy env: `cp .env.example .env.local`
- Install and run:
```bash
npm install
npm run dev
```

## 5) Environment Variables (.env.example)
```bash
# Supabase (Cloud mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ENABLE_SUPABASE=true

# Offline cache / PWA
NEXT_PUBLIC_ENABLE_OFFLINE_CACHE=true

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN=
```

## 6) Package Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "test": "jest",
    "analyze": "node scripts/analyze-bundle.mjs"
  }
}
```

## 7) Coding Standards
- TypeScript strict mode
- ESLint: next/core-web-vitals
- Prettier default
- Conventional commits; protected main

## 8) PWA Setup
- Manifest: app name, icons, themeColor.
- Service Worker responsibilities:
  - Cache app shell and GET data; never cache non‑GET requests
  - Update flow: registration.waiting → SKIP_WAITING → controllerchange → reload
- Update UX:
  - In‑app banner when an update is available
  - Settings → Check for updates → refresh
- CSP requirements (headers in Next config):
```
worker-src 'self';
connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com;
```

## 9) Storage Architecture
- Cloud mode (Supabase): primary provider with IndexedDB caching
- Local mode: localStorage only; still supports backups
- Auth‑aware provider switches on sign‑in/out
- Import/Export:
  - Full backup includes players, games, seasons, tournaments, settings
  - Import auto‑remaps old player IDs → new UUIDs (selectedPlayerIds, playersOnField, events)
  - Unmapped references are dropped and logged

## 10) Authentication & Security
- Supabase Auth sessions with refresh; inactivity timeout via SessionManager
- Multi‑device policy: allowed; Settings exposes “Sign out” and “Sign out everywhere”
- Sign‑out flow:
  - UI‑first: cancel in‑flight work, clear caches, broadcast to tabs, clear auth keys, background revoke
- Security headers and production CSP required

## 11) Internationalization
- Default language: fi (example), fallback en
- Client‑side resource loading `/public/locales/{lang}/common.json`
- Language persisted in app settings; `<html lang>` synced on change

## 12) Testing Strategy
- Jest + RTL unit tests for logic and components
- Mock i18n and storage providers for deterministic tests
- Optional smoke tests script in `scripts/smoke-test.sh`

## 13) CI/CD & Environments
- Vercel project with Preview/Production
- Per‑env `.env` with Supabase creds
- Release checklist:
  1. Bump version; generate release notes (`scripts/generate-release-notes.mjs`)
  2. Deploy; run smoke tests
  3. Verify: update banner, monitoring, Sentry test page, PWA install, import/export with auto remap

## 14) Performance & A11y
- Targets: fast LCP, responsive INP
- SW cache budgets; avoid N+1 fetches
- A11y: focus styles, ARIA for modals, color contrast

## 15) Operations & Troubleshooting
- SW registration fails → check CSP and that `public/sw.js` is deployed
- Supabase 401 → env mismatch; ensure ENABLE_SUPABASE=true
- Import produces empty rosters → re‑import; auto remap will fix; inspect import log
- Update banner missing → use Settings → Check for updates; verify CSP
- Sign‑out stuck → ensured immediate UI‑first sign‑out + cache‑busted redirect

## 16) Bootstrap Checklist (copy for new project)
- Create repo from this template
- Update branding: app name, icons, manifest
- Create Supabase project; set RLS/auth and keys
- Fill `.env.local`; run `npm run dev`
- Validate flows:
  - Sign up/in, save game, export/import (auto ID remap visible in log)
  - PWA install (mobile + desktop), offline flow
  - Update banner & Settings “Check for updates”
  - Monitoring page and Sentry test
- Commit, deploy, verify, tag release

## 17) Appendix
- .editorconfig, .nvmrc suggested
- Minimal manifest.json skeleton
- Example CSP header snippet (above)

---

This blueprint captures the exact setup used in MatchDay Coach. Copy, search‑replace branding, adjust CSP domains (Supabase/Sentry), and you have a ready‑to‑ship baseline.
