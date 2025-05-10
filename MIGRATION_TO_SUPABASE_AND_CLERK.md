# Migration Plan: localStorage to Supabase & Clerk Authentication

**Version:** 1.0
**Date:** 2024-07-30
**Status:** Planning

## 1. Overview

This document outlines the plan to migrate the application's data persistence layer from browser localStorage to Supabase, and to integrate Clerk for user authentication. This migration aims to provide a more robust, scalable, and secure data management solution, enabling user-specific data and future feature enhancements.

## 2. Goals

*   Replace localStorage with Supabase for all application data storage.
*   Implement user authentication using Clerk.
*   Ensure a step-by-step migration process to minimize disruption and allow for continuous testing.
*   Maintain a clear branching strategy to isolate migration work while allowing parallel feature development.
*   Document the migration process and new architecture.

## 3. Branching Strategy

*   **Main Migration Branch:** A dedicated branch, tentatively named `feat/supabase-clerk-migration`, will be created from `master` (or your current main development branch). All migration and integration work will occur on this branch.
*   **Feature Branches:** Any new, unrelated feature development will occur in separate feature branches, branched off from `master` (or the main development branch).
*   **Integration:** To keep the `feat/supabase-clerk-migration` branch up-to-date and ensure compatibility, changes from completed feature branches (after they are merged to `master`) will be regularly merged into `feat/supabase-clerk-migration`. Alternatively, if features are developed in parallel that *depend* on the migration, they might be branched from `feat/supabase-clerk-migration` itself, but this should be carefully managed. The primary approach is to merge `master` into the migration branch frequently.
*   **Completion:** Once the migration is complete, thoroughly tested, and stable, the `feat/supabase-clerk-migration` branch will be merged into `master`.

## 4. Migration Phases

The migration will be performed incrementally.

### Phase 1: Supabase Setup and Initial Data Model Migration

1.  **Supabase Project Setup:**
    *   Create a new project in Supabase.
    *   Configure database settings, API keys, and environment variables.
    *   Store Supabase URL and anon key securely (e.g., in `.env.local` for development, and configure for deployment environments). See Section 5.1.1 for a list of expected environment variables.
2.  **Identify Data Models:**
    *   List all distinct data entities currently stored in localStorage (e.g., user settings, game states, application preferences).
3.  **Design Supabase Schema:**
    *   For each identified data entity, design the corresponding table schema in Supabase.
    *   Define appropriate data types, relationships, and constraints.

### 1.3.1. Proposed Supabase Table Structures

Based on the investigation of `localStorage` usage, the following tables are proposed. All tables should also include a `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` column once Clerk authentication is integrated, to scope data to individual users. Timestamps like `created_at` and `updated_at` (defaulting to `now()`) are recommended for all tables.

**Standard Row Level Security (RLS) Policy:** For each table containing user-specific data, a policy similar to the following should be implemented:
`CREATE POLICY "Users can manage their own data" ON table_name FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`

**1. `players` (Master Roster)**

Stores the master list of all players available to a user.

| Column          | Data Type                  | Constraints/Notes                                            |
|-----------------|----------------------------|--------------------------------------------------------------|
| `id`            | `UUID`                     | Primary Key, auto-generated (or `TEXT` if migrating existing string IDs) |
| `user_id`       | `UUID`                     | Foreign Key to `auth.users(id)`                              |
| `name`          | `TEXT`                     | NOT NULL                                                     |
| `nickname`      | `TEXT`                     | NULLABLE                                                     |
| `jersey_number` | `TEXT`                     | NULLABLE (TEXT allows for "00", "1A", etc.)                  |
| `notes`         | `TEXT`                     | NULLABLE                                                     |
| `is_goalie`     | `BOOLEAN`                  | NOT NULL, DEFAULT `false`                                    |
| `created_at`    | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                    |
| `updated_at`    | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                    |

**2. `app_settings` (User-Specific Application Settings)**

Stores settings and preferences for each user. Assumes a one-to-one relationship with users.

| Column                | Data Type                  | Constraints/Notes                                                       |
|-----------------------|----------------------------|-------------------------------------------------------------------------|
| `user_id`             | `UUID`                     | Primary Key, Foreign Key to `auth.users(id)`                            |
| `current_game_id`     | `TEXT`                     | NULLABLE (References `saved_games.id`, not a formal FK initially)       |
| `other_settings`      | `JSONB`                    | NULLABLE. Stores miscellaneous settings like `last_home_team_name`, `install_prompt_dismissed_at`, UI preferences, etc. Example: `{"lastHomeTeamName": "Dragons", "theme": "dark", "language": "en"}` |
| `created_at`          | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                               |
| `updated_at`          | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                               |

*   `other_settings.last_home_team_name`: string
*   `other_settings.install_prompt_dismissed_at`: string (timestamp)
*   `other_settings.language`: string (e.g., "en", "fi")

**3. `seasons` (List of Seasons)**

Stores user-created seasons or leagues.

| Column       | Data Type                  | Constraints/Notes                                           |
|--------------|----------------------------|-------------------------------------------------------------|
| `id`         | `TEXT`                     | Primary Key (current client-generated string ID format)     |
| `user_id`    | `UUID`                     | Foreign Key to `auth.users(id)`                             |
| `name`       | `TEXT`                     | NOT NULL                                                    |
| `start_date` | `DATE`                     | NULLABLE (for future use)                                   |
| `end_date`   | `DATE`                     | NULLABLE (for future use)                                   |
| `details`    | `JSONB`                    | NULLABLE (for other season-specific info)                   |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |

**4. `tournaments` (List of Tournaments)**

Stores user-created tournaments.

| Column       | Data Type                  | Constraints/Notes                                           |
|--------------|----------------------------|-------------------------------------------------------------|
| `id`         | `TEXT`                     | Primary Key (current client-generated string ID format)     |
| `user_id`    | `UUID`                     | Foreign Key to `auth.users(id)`                             |
| `name`       | `TEXT`                     | NOT NULL                                                    |
| `date`       | `DATE`                     | NULLABLE (for future use)                                   |
| `location`   | `TEXT`                     | NULLABLE (for future use)                                   |
| `details`    | `JSONB`                    | NULLABLE (for other tournament-specific info)               |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |

**5. `saved_games` (Individual Game States)**

Stores the detailed state of each game a user has saved. This is the most complex table.

| Column                             | Data Type                  | Constraints/Notes                                           |
|------------------------------------|----------------------------|-------------------------------------------------------------|
| `id`                               | `TEXT`                     | Primary Key (current client-generated string game ID)       |
| `user_id`                          | `UUID`                     | Foreign Key to `auth.users(id)`                             |
| `team_name`                        | `TEXT`                     | NULLABLE (or default value)                                 |
| `opponent_name`                    | `TEXT`                     | NULLABLE (or default value)                                 |
| `game_date`                        | `DATE`                     | NULLABLE                                                    |
| `game_time`                        | `TIME`                     | NULLABLE                                                    |
| `game_location`                    | `TEXT`                     | NULLABLE                                                    |
| `home_or_away`                     | `TEXT`                     | NULLABLE (ENUM: 'home', 'away')                             |
| `home_score`                       | `INTEGER`                  | NOT NULL, DEFAULT 0                                         |
| `away_score`                       | `INTEGER`                  | NOT NULL, DEFAULT 0                                         |
| `number_of_periods`                | `INTEGER`                  | NOT NULL, DEFAULT 2                                         |
| `period_duration_minutes`          | `INTEGER`                  | NOT NULL, DEFAULT 10                                        |
| `current_period`                   | `INTEGER`                  | NULLABLE (represents state at time of save)                 |
| `game_status`                      | `TEXT`                     | NULLABLE (ENUM: 'notStarted', 'inProgress', 'paused', 'finished') |
| `game_notes`                       | `TEXT`                     | NULLABLE                                                    |
| `show_player_names_on_field`       | `BOOLEAN`                  | NOT NULL, DEFAULT `true`                                    |
| `sub_interval_minutes`             | `INTEGER`                  | NULLABLE                                                    |
| `last_sub_confirmation_time_seconds` | `INTEGER`                  | NULLABLE                                                    |
| `season_id`                        | `TEXT`                     | NULLABLE, Foreign Key to `seasons.id` (on delete set null)  |
| `tournament_id`                    | `TEXT`                     | NULLABLE, Foreign Key to `tournaments.id` (on delete set null) |
| `selected_player_ids`              | `JSONB`                    | NULLABLE. Array of player UUIDs/TEXT IDs from `players` table. `Player['id'][]` |
| `game_roster_snapshot`             | `JSONB`                    | NULLABLE. Snapshot of `Player[]` objects available at game time. Structure: `{id, name, nickname?, jerseyNumber?, notes?, isGoalie?}` |
| `players_on_field_state`           | `JSONB`                    | NULLABLE. Array of `PlayerOnField` objects. Structure: `{playerId, relX, relY, ...other Player fields if needed}` |
| `opponents_state`                  | `JSONB`                    | NULLABLE. Array of `Opponent` objects. Structure: `{id, relX, relY}` |
| `drawings_state`                   | `JSONB`                    | NULLABLE. Array of `Point[]` arrays. Point structure: `{x, y}` |
| `game_events_log`                  | `JSONB`                    | NULLABLE. Array of `GameEvent` objects. Varied structure based on type. |
| `completed_interval_durations_log` | `JSONB`                    | NULLABLE. Array of `IntervalLog` objects. Structure: `{period, duration, timestamp}` |
| `created_at`                       | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |
| `updated_at`                       | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |

**JSONB Column Structures for `saved_games` (details):**

*   **`game_roster_snapshot`**: `Array<Player>`
    *   `Player`: `{ id: string, name: string, nickname?: string, jerseyNumber?: string, notes?: string, isGoalie?: boolean, receivedFairPlayCard?: boolean }`
*   **`players_on_field_state`**: `Array<PlayerOnField>`
    *   `PlayerOnField`: `{ id: string, name: string, ..., relX: number, relY: number }` (extends Player)
*   **`opponents_state`**: `Array<Opponent>`
    *   `Opponent`: `{ id: string, relX: number, relY: number }`
*   **`drawings_state`**: `Array<Array<Point>>`
    *   `Point`: `{ x: number, y: number }`
*   **`game_events_log`**: `Array<GameEvent>`
    *   `GameEvent (Base)`: `{ id: TEXT, type: TEXT NOT NULL, time: INTEGER NOT NULL, period?: INTEGER, notes?: TEXT }`
        *   Specific fields based on `type`:
            *   `goal`: `scorerId: TEXT` (Player ID), `assisterId?: TEXT` (Player ID)
            *   `opponentGoal`: (No specific player IDs from roster needed)
            *   `substitution`: `playerInId: TEXT NOT NULL` (Player ID), `playerOutId: TEXT NOT NULL` (Player ID)
            *   `penaltyScored`: `scorerId: TEXT NOT NULL` (Player ID)
            *   `penaltyMissed`: `playerId: TEXT NOT NULL` (Player ID)
            *   `card`: `playerId: TEXT NOT NULL` (Player ID), `cardType: TEXT NOT NULL` (e.g., "yellow", "red")
            *   *(Other custom event types can be added with their specific fields)*
*   **`completed_interval_durations_log`**: `Array<IntervalLog>`
    *   `IntervalLog`: `{ period: number, duration: number, timestamp: number }`

This detailed schema will serve as a strong foundation for the database migration.

5.  **First Data Entity Migration (Example: User Preferences):**
    *   **Choose Entity:** Select the first data entity to migrate (e.g., `app_settings` or `players`).
    *   **Create Table:** Create the actual Supabase table based on the defined schema.
    *   **Implement CRUD Operations:** Develop service functions/hooks for Create, Read, Update, and Delete operations for this entity using the Supabase client. These should be user-aware (expecting a `user_id`).
    *   **Develop Data Migration Logic (Client-Side):**
        *   **Trigger:** This logic will run once per user *after their first successful Clerk authentication* (sign-up or sign-in) on a device with existing `localStorage` data.
        *   **Process:**
            1.  Obtain the authenticated user's `auth.uid()` from Clerk.
            2.  Read the specific data entity from `localStorage`.
            3.  If data exists and is valid:
                *   Transform/map the `localStorage` data to the Supabase table structure.
                *   Write the data to the corresponding Supabase table, associating it with the `user_id`.
                *   Implement checks to prevent duplicate data insertion if the script somehow runs multiple times (e.g., check if `app_settings` for `user_id` already exists before inserting).
            4.  **Error Handling:**
                *   Gracefully handle `JSON.parse()` errors or unexpected data structures in `localStorage`. Log errors to the console.
                *   **Granular Error Strategy for `saved_games`:**
                    *   If an entire game object within the `SAVED_GAMES_KEY` array in `localStorage` is unparseable (e.g., due to severe corruption), that specific game should be skipped, an error logged, and the migration process should attempt to continue with other games.
                    *   If a `saved_game` is parseable but contains a malformed individual record within its nested arrays (e.g., a single event in `game_events_log`), the strategy should be to skip that individual malformed record, log the issue, and continue migrating the rest of the game's data if possible. The goal is to salvage as much valid data as possible.
                *   Handle Supabase client API errors (e.g., network issues, policy violations if RLS is prematurely active).
            5.  **User Feedback:** Provide clear visual feedback to the user during this one-time process (e.g., "Migrating your settings...", "Updating your roster...", "Migrating game X of Y..."). This is especially important for potentially lengthy migrations like `saved_games`.
            6.  **Clear `localStorage`:** Upon successful migration of an entity to Supabase for the user, clear that specific key from `localStorage` on that device.
    *   **Refactor Application Code:** Update the application to use the new Supabase CRUD functions instead of `localStorage` for this entity. This code will now be asynchronous and user-aware.
    *   **Testing (Critical):**
        *   Thoroughly test CRUD operations against Supabase.
        *   Rigorously test the data migration logic with various `localStorage` states:
            *   No existing data.
            *   Valid existing data.
            *   Partially corrupted or malformed `localStorage` data.
            *   Simulate migration on first login and subsequent logins (migration should only run once).

### Phase 2: Remaining Data Models Migration

*   Repeat step 5 from Phase 1 for each remaining data entity (`players`, `seasons`, `tournaments`, `saved_games`).
*   **Order of Migration:** Consider dependencies. For example, `saved_games` refers to `season_id` and `tournament_id`. While not strict foreign keys initially, migrating `seasons` and `tournaments` before or alongside `saved_games` might be logical. `players` (master roster) should also be migrated before `saved_games` if `saved_games` references player IDs extensively.
*   The `saved_games` entity will be the most complex to migrate due to its size and nested structures.

### Phase 3: Clerk Authentication Integration

1.  **Clerk Project Setup:**
    *   Create a new application in Clerk.
    *   Configure authentication methods, social providers (if any), and UI customization.
    *   Obtain Clerk Frontend API key and other necessary credentials. Store them securely.
2.  **Clerk SDK Integration:**
    *   Install the Clerk Next.js SDK (`@clerk/nextjs`).
    *   Wrap the application with `ClerkProvider`.
    *   Set up required environment variables (e.g., `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
3.  **Implement Authentication UI:**
    *   Create sign-in, sign-up, and user profile pages/components using Clerk's components (e.g., `<SignIn>`, `<SignUp>`, `<UserButton>`).
    *   Implement sign-out functionality.
4.  **Protect Routes and Components:**
    *   Use Clerk's helpers (e.g., `withAuth`, `useAuth`) to protect routes and conditionally render UI elements based on authentication status.
5.  **Associate Supabase Data with Users:**
    *   Ensure all Supabase tables designed in Phase 1.3.1 have the `user_id` column.
    *   Implement Row Level Security (RLS) policies for each table to ensure users can only access/modify their own data. (See RLS policy examples in Section 1.3.1).
    *   Client-side Supabase queries must be made in the context of the authenticated user. The data migration logic (Phase 1.5.d) is the primary mechanism for associating existing anonymous data with a new user identity. For data created *after* login, the `user_id` will be set directly.

### Phase 4: Testing and Refinement

1.  **End-to-End Testing:**
    *   **Anonymous to Authenticated Migration Flow:** Test the complete journey: new user visits app (no `localStorage` data) -> signs up via Clerk -> (optional: initial data seeding if applicable, see Section 5.7) -> uses app, creates data. Then, user on a *different device* with *existing `localStorage` data* -> signs in with the same Clerk account -> verify `localStorage` data is migrated and associated with their account, and `localStorage` is cleared.
    *   Test the user flow for users who already have `localStorage` data, sign up/in for the first time, and their data gets migrated.
    *   Test CRUD operations for all migrated entities, ensuring they are correctly scoped to the authenticated user.
2.  **Performance Testing:**
    *   Assess any performance implications of fetching data from Supabase versus localStorage. Optimize queries if necessary.
3.  **Security Audit:**
    *   Review Supabase RLS policies.
    *   Ensure API keys and sensitive credentials are not exposed on the client-side where not intended.
    *   Verify Clerk security configurations.

### Phase 5: Documentation and Deployment

1.  **Update README:**
    *   Add instructions for setting up environment variables for Supabase and Clerk.
    *   Document any new build steps or considerations.
2.  **Code Comments & Internal Docs:**
    *   Ensure new services, hooks, and complex logic are well-commented.
3.  **Deployment Configuration:**
    *   Set up production environment variables for Supabase and Clerk in your hosting environment.
    *   Test the migration and authentication thoroughly in a staging/preview environment before deploying to production.
4.  **Final Merge:**
    *   After successful testing and review, merge the `feat/supabase-clerk-migration` branch into `master`.

## 5. Considerations & Potential Challenges

*   **Existing Users' Data:** Carefully plan how existing localStorage data will be migrated to Supabase. This might involve a client-side script that runs once per user.
*   **Offline Support:** Moving from localStorage to a server-based solution like Supabase means the application will require an internet connection for most data operations. **The current plan results in an online-only application for data persistence.** If offline capability is a critical long-term requirement, it will need a separate, dedicated planning phase and technical design (e.g., using local caching strategies like IndexedDB with a robust synchronization mechanism to Supabase).
*   **Error Handling:** Implement robust error handling for Supabase API calls and Clerk authentication processes.
*   **Rate Limiting:** Be aware of potential rate limits for Supabase and Clerk, especially during initial data migration or high traffic.
*   **Schema Evolution:** Plan for how database schema changes will be managed in the future.
*   **Security:** Row Level Security in Supabase is paramount. Ensure it's correctly implemented and tested for every table containing user data. Refer to policy examples in Section 1.3.1.
*   **Initial Data for New Users:** For users signing up for the first time *without* any existing `localStorage` data to migrate (i.e., new to the app ecosystem), consider if any initial data needs to be seeded into their Supabase tables (e.g., a default player roster if `initialAvailablePlayersData` from the current codebase is desired). This could be handled by a client-side check on first login: if no data exists in Supabase for key entities, seed defaults. Alternatively, a Supabase Function triggered by Clerk's new user webhook could perform this. This needs to be defined and implemented.
*   **User Experience during One-Time Migration:** The data migration script (Phase 1.5.d) should provide clear visual feedback (loading states, progress indicators if possible, success/error messages) to the user. This avoids the perception of a frozen or broken application during this crucial one-time step.

## 6. Rollback Plan (High-Level)

*   In case of critical issues post-deployment, a rollback would involve reverting to the commit on `master` before the merge of `feat/supabase-clerk-migration`.
*   Data written to Supabase during a problematic period might need manual reconciliation if a rollback is performed. This emphasizes the importance of thorough testing in a staging environment.

## 7. Environment Variables

The following environment variables will be required for the application to connect to Supabase and Clerk:

*   `NEXT_PUBLIC_SUPABASE_URL`: The URL for your Supabase project.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for your Supabase project.
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: The publishable key for your Clerk application.
*   `CLERK_SECRET_KEY`: The secret key for your Clerk application (used on the backend, e.g., in Next.js API routes or middleware if applicable).

These should be configured in `.env.local` for local development and in the respective environment variable settings of your deployment platform (e.g., Vercel, Netlify).

This document will be updated as the migration progresses and new details emerge. 