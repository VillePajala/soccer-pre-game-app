# Migrating to Supabase

This document explains how to move the MatchDay Coach application from storing data in browser `localStorage` to using Supabase as a backend. It assumes familiarity with the current architecture described in [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md).

## 1. Current State Overview

The application is a PWA built with Next.js 15, React 19 and TypeScript. All persistent data is kept in `localStorage` as noted in the project documentation:

```
50  *   **Data Persistence:** Browser `localStorage` API
```
from the [README](./README.md) and

```
54  **Data Persistence**: All data is stored in browser localStorage with async wrappers in `src/utils/localStorage.ts`.
```
from [CLAUDE.md](./CLAUDE.md).

Key modules that interact with storage are:

- `src/utils/masterRoster.ts` and `src/utils/masterRosterManager.ts`
- `src/utils/seasons.ts` and `src/utils/tournaments.ts`
- `src/utils/savedGames.ts`
- `src/utils/appSettings.ts`

`React Query` is already used to fetch from these utilities. This architecture will help in switching to an external API.

## 2. Preparing Supabase

1. **Create a Supabase project** – Sign in to [supabase.com](https://supabase.com) and create a new project. Note the API URL and anon/public key.
2. **Define the database schema** – Tables should mirror the data structures in `src/types`. Example tables:
   - `players`: id (PK), name, nickname, jersey_number, notes, is_goalie, received_fair_play_card.
   - `seasons` and `tournaments`: id (PK), name.
   - `games`: stores the serialized `AppState` object for each game plus metadata such as date and associated season or tournament.
   - `app_settings`: keyed by user (if using auth) for storing settings like `current_game_id`.
3. **Enable Row Level Security (RLS)** – If using authentication, enable RLS and create policies allowing users to access their own data.
4. **Generate service key and anon key** – These credentials will be stored as environment variables in `.env.local`.

### Data Rework Considerations

Before connecting the app to Supabase, review the existing local data for potential schema adjustments:

- **ID formats** – Local records use string IDs like `"player_<timestamp>_<random>"`. Decide whether to keep these values or convert them to UUIDs on import.
- **Flattening game data** – The `AppState` object stores events and assessments as nested arrays. For efficient queries, consider normalising this information into `game_events` and `player_assessments` tables.
- **Season and tournament fields** – Some optional fields (`location`, `periodCount`, `archived`, etc.) may be missing in older records. Populate sensible defaults or handle `null` values during migration.
- **Transformation utilities** – Build helper functions that map the current TypeScript types to the new table structure. These utilities make it easier to validate and transform data during import.
- **App settings per user** – Once authentication is enabled, settings should be keyed by `user_id`. Link existing local settings to the signed‑in user on first login.

## 3. Installing supabase-js

Add the official client library and types:

```bash
npm install @supabase/supabase-js
```

Create a helper module `src/utils/supabaseClient.ts` to instantiate the client using environment variables. This file will export the configured instance for use in queries and mutations.

## 4. Replacing localStorage Utilities

Each storage helper under `src/utils` currently reads or writes to `localStorage`. For example `masterRoster.ts` uses `localStorage.getItem(SEASONS_LIST_KEY)`.

Replace the logic in these utilities with Supabase API calls using `supabase.from('players').select()` and similar operations. Consider using `supabase.rpc()` functions for complex updates.

Return values and error handling should mirror the existing asynchronous interfaces so that components using them do not require large changes.

### Example

Old roster fetcher in `src/utils/masterRoster.ts`:

```ts
export const getMasterRoster = async (): Promise<Player[]> => {
  const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
  return rosterJson ? JSON.parse(rosterJson) : [];
};
```

Supabase version:

```ts
import { supabase } from './supabaseClient';

export const getMasterRoster = async (): Promise<Player[]> => {
  const { data, error } = await supabase.from('players').select('*');
  if (error) throw error;
  return data as Player[];
};
```

With these updates, `useGameDataQueries` continues to invoke the same helper functions, but the data now comes from Supabase.

## 5. Handling Authentication

Supabase provides a built-in authentication system. If user accounts are desirable, integrate `@supabase/auth-helpers-nextjs` and protect API routes using sessions. Each user's data can then be stored using their `user.id` as a foreign key. If the app should remain anonymous, you can skip auth and store data keyed by `localStorage` token or by using the public anon key.

## 6. Offline Support

PWA capabilities such as the service worker remain valuable. When moving to Supabase, you can still cache requests using `@supabase/supabase-js` together with `React Query`'s caching.

The service worker in `public/sw.js` currently only passes through requests. Consider implementing a cache-first strategy for API responses to keep the app usable without network connectivity.

## 7. Migrating Existing Data

Users may already have important data saved locally. Provide an export feature that generates a JSON file (the current app already supports this via `exportGamesAsJson`). After deploying Supabase, add an import routine that uploads this JSON into the new database, calling the Supabase APIs for each record.

## 8. Environment Configuration

Create `.env.local` with the following keys:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
```

If server-side operations (such as triggers or scheduled jobs) are needed, also store the service role key as `SUPABASE_SERVICE_KEY` but never expose it to the client.

## 9. Updating React Query Calls

The existing `useGameDataQueries` hook already consolidates queries for roster, seasons, tournaments and saved games. Once the utilities are refactored, this hook will automatically fetch from Supabase. For mutations (adding or updating players, games or settings) use `useMutation` with Supabase API functions, and call `queryClient.invalidateQueries` with the keys defined in `src/config/queryKeys.ts`.

## 10. API Routes (Optional)

Instead of calling Supabase directly from the browser, you may create Next.js API routes under `src/pages/api/` that proxy requests to Supabase. This allows you to enforce additional validation or authentication middleware on the server side. It also hides the Supabase keys from the client. However, direct client-side calls with the anon key are acceptable for many use cases.

## 11. Updating Build Scripts

The script `scripts/generate-manifest.mjs` already updates the service worker timestamp and generates the PWA manifest. Add steps to populate environment variables for Supabase during build on Vercel.

## 12. Testing and Deployment

1. Run `npm run lint` and `npm test` to ensure no regressions.
2. Verify manual workflows listed in `MANUAL_TESTING.md` while connected to Supabase.
3. Deploy to Vercel with the Supabase environment variables configured.

Migrating to Supabase centralizes data, enables real-time features and simplifies backups while the rest of the React front end remains largely unchanged.
