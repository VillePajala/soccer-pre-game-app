# Supabase Migration Master Checklist

> **Purpose**  
> A single, self‑contained checklist the AI agent can follow (and tick off) to migrate the PWA from **localStorage** to **Supabase**.

---

## Context
- App: mobile‑first PWA (TypeScript + React)  
- Current persistence: **localStorage** only  
- Target: Supabase (Postgres + Auth + Realtime)  
- Repo: Vite / Next.js layout  
- Node ≥ 18

---

## High‑Level Objective
Migrate the entire persistence layer to Supabase, enabling multi‑user, real‑time sync, **without breaking the existing UX**.

---

## Deliverables
- `/docs/migration-supabase.md`
- `/schema.sql`
- `/src/lib/storageManager.ts`
- `/scripts/migrateLocalToSupabase.ts`
- Unit & integration tests
- Incremental commits (one per major step)

---

## Step‑by‑Step Execution Plan

### Core Steps  
- [ ] **1 — Inventory Current Data**
  - [ ] Parse codebase for every `localStorage.*` usage
  - [ ] Generate `/docs/localStorage-map.json` with keys & samples

- [ ] **2 — Design Supabase Schema**
  - [ ] Infer TS interfaces (Game, Player, Stats, Settings…)
  - [ ] Normalise into tables / JSONB as needed
  - [ ] Draft `schema.sql` (tables, PK/FK, RLS, indexes)
  - [ ] Create ER diagram (ASCII / Mermaid)

- [ ] **3 — Bootstrap Supabase Project**
  - [ ] `supabase init` → `.supabase`
  - [ ] `supabase db push` with `schema.sql`
  - [ ] Add anon & service keys to `.env.sample`

- [ ] **4 — Build Storage Abstraction Layer**
  - [ ] Implement `LocalDriver` (wrap existing logic)
  - [ ] Implement `SupabaseDriver` with `@supabase/supabase-js`
  - [ ] Expose runtime‑switchable `storage` API

- [ ] **5 — Refactor App to use `storage`**
  - [ ] Replace direct `localStorage` calls (codemod/regex)
  - [ ] Commit: `refactor(storage): centralise persistence`

- [ ] **6 — Add Authentication**
  - [ ] Enable Email‑Link & OAuth in Supabase
  - [ ] Add `AuthProvider` React context
  - [ ] Store user profile in `profiles` table

- [ ] **7 — Write One‑Shot Migration Script**
  - [ ] Transform local data → Supabase schema
  - [ ] Insert on first login
  - [ ] Set `migrationDone` flag per user

- [ ] **8 — Offline Cache / Sync (optional)**
  - [ ] Add IndexedDB layer (`idb-keyval`)
  - [ ] Queue writes offline, flush on reconnect

- [ ] **9 — Testing & QA**
  - [ ] Unit tests for each driver
  - [ ] Cypress flow: signup → create data → multi‑device

- [ ] **10 — Feature Flag Roll‑Out**
  - [ ] Env var `ENABLE_SUPABASE`
  - [ ] Default false until QA passes

- [ ] **11 — Documentation & Handoff**
  - [ ] Finish `migration-supabase.md`
  - [ ] Update `README.md`

- [ ] **12 — Post‑Migration Cleanup**
  - [ ] Remove unused localStorage keys
  - [ ] Schedule sunset for `LocalDriver`

### Quality Gates
- [ ] ESLint + Prettier pass
- [ ] `pnpm test` green
- [ ] Conventional commit messages
- [ ] No secrets committed

---

## Success Criteria
- All data saved in Supabase; `LocalDriver` only used when flag off  
- Multi‑device sync works with auth  
- One‑shot migration succeeds for legacy users  
- Tests green, docs complete  

---

**Agent protocol:**  
Before each major step, create `/logs/{step}-plan.md` with sub‑tasks & exit criteria. After completing, run tests & lint, then commit to `supabase-migration-{step}` branch and open PR.
