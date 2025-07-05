# Migrating from localStorage to IndexedDB

## Goal

Replace all browser `localStorage` usage with IndexedDB to support larger datasets, structured queries, and future scalability while keeping the application fully offline-capable.

## 1. Current Persistence Overview

The app stores all data in `localStorage` under various keys:

- `soccerSeasons` – season objects
- `soccerTournaments` – tournament objects
- `savedSoccerGames` – saved game state collection
- `soccerAppSettings` – user settings and last opened game id
- `soccerMasterRoster` – master player list
- `lastHomeTeamName` – cached team name
- `soccerTimerState` – timer status during gameplay

Utilities such as `src/utils/seasons.ts` and `src/utils/tournaments.ts` perform CRUD operations directly on these keys through asynchronous wrappers in `src/utils/localStorage.ts`.
Existing features (backup/export, load game on page mount, etc.) assume synchronous access to these keys.

## 2. Why IndexedDB

- Handles much larger amounts of data than `localStorage`.
- Supports structured records, indexes and transactions.
- Asynchronous by design, which aligns well with future plans for external databases.
- Still available offline and widely supported in modern browsers.

## 3. Library Options

1. **Dexie.js** – feature rich wrapper, simple migration system, great developer ergonomics.
2. **idb** (from Jake Archibald) – small promise-based wrapper around raw IndexedDB.
3. **Raw IndexedDB API** – no dependencies but verbose.

Choosing Dexie or idb will greatly simplify code compared to using the raw API. Dexie offers schema versioning and query helpers which may help with future expansions. idb keeps bundle size minimal. The plan assumes Dexie, but the design should abstract the library to allow replacement.

## 4. Database Schema

Create a database named `soccer-pre-game-db` with versioned object stores:

| Store          | Key Path        | Notes                                   |
| -------------- | --------------- | --------------------------------------- |
| `roster`       | `id`            | Players from the master roster          |
| `seasons`      | `id`            | Season objects                          |
| `tournaments`  | `id`            | Tournament objects                      |
| `games`        | `id`            | Saved game states                       |
| `settings`     | `key`           | Single record for user/app settings     |
| `timerState`   | `id`            | Persisted timer status (optional)       |

Indexes can be added later for queries (e.g., by seasonId or tournamentId on games).

## 5. Implementation Steps

1. **Add Dexie dependency**
   - `npm install dexie`
   - Create `src/db/index.ts` exporting a configured `Dexie` instance and typed stores.
2. **Implement generic CRUD helpers**
   - Replace `src/utils/localStorage.ts` with functions that use the Dexie stores.
   - Provide helpers like `getItem(storeName, key)`, `putItem(storeName, value)`.
3. **Refactor existing utilities**
   - Update `src/utils/seasons.ts`, `src/utils/tournaments.ts`, backup utilities and any component that reads/writes localStorage to use the new DB helpers.
   - Keep function signatures largely the same (still returning promises).
4. **Migration script**
   - On application start, check a flag such as `indexeddbMigrated` in `localStorage` or `settings` store.
   - If migration has not run:
     - Read all existing data from `localStorage` via the old utilities.
     - Populate corresponding IndexedDB stores inside a single transaction.
     - Once successful, set the flag and optionally remove old keys.
   - Ensure this process is idempotent and handles partial failures (e.g., show error and fall back to localStorage if IndexedDB unavailable).
5. **Update Backup & Restore**
   - Modify `src/utils/fullBackup.ts` to read from/write to IndexedDB stores.
   - Keep the JSON structure similar so existing backups remain compatible. Consider adding a `storageVersion` field for future migrations.
6. **Testing Adjustments**
   - Replace localStorage mocks with IndexedDB mocks. Dexie provides an in-memory implementation for tests.
   - Update jest setup in `src/setupTests.js` accordingly.
7. **Clean Up**
   - Remove old `localStorage` utility file and references after migration is stable.
   - Update README and docs to note that data resides in IndexedDB.

## 6. Rollout Strategy

1. **Phase 1 – Dual Write (optional)**
   - During development, write changes to both localStorage and IndexedDB to verify correctness.
   - Use automated tests to confirm both storages stay in sync.
2. **Phase 2 – Migrate Existing Users**
   - Deploy migration logic; it copies localStorage data into IndexedDB on first load after update.
   - Show a notification when migration succeeds and remind users to make a backup.
3. **Phase 3 – Remove localStorage**
   - After verifying no issues, stop writing to localStorage and clean up old data.

## 7. Considerations

- **Browser Support**: IndexedDB is well supported but confirm functionality on all target browsers, especially mobile Safari and legacy Android Chrome.
- **Error Handling**: Provide clear user feedback if the database cannot be opened or migration fails. Offer a manual backup option before clearing old data.
- **Backup Compatibility**: Maintain import/export features so users can recover data across versions. Include both `storageVersion` and `schema` in backups.
- **Future Extensions**: Using Dexie prepares the project for eventual server sync or offline-first strategies.

## 8. Example Initialization Code

```ts
import Dexie, { Table } from 'dexie';
import { Player, Season, Tournament } from '@/types';

export interface GameState { /* existing saved game shape */ }
export interface AppSetting { key: string; value: any }

class SoccerDB extends Dexie {
  roster!: Table<Player, string>;
  seasons!: Table<Season, string>;
  tournaments!: Table<Tournament, string>;
  games!: Table<GameState, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('soccer-pre-game-db');
    this.version(1).stores({
      roster: 'id',
      seasons: 'id',
      tournaments: 'id',
      games: 'id',
      settings: 'key',
    });
  }
}

export const db = new SoccerDB();
```

The CRUD utilities will import `db` and perform operations like `db.roster.put(player)` or `db.games.get(id)`.

## 9. Documentation Updates

- Add this plan to the repository documentation.
- Update the README and in-app help sections to mention IndexedDB as the storage layer.
- Ensure the "Full Backup" warning still advises regular exports since clearing browser data will erase the IndexedDB database.

---

Following this roadmap will shift persistence from localStorage to IndexedDB with minimal disruption and lay the groundwork for more advanced data management in the future.
