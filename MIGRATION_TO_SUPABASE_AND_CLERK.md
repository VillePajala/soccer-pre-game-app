# Migration Plan: localStorage to Supabase & Clerk Authentication

**Version:** 1.1
**Date:** 2024-07-30 (Updated: 2024-12-19)
**Status:** Planning

## 1. Overview

This document outlines the plan to migrate the application's data persistence layer from browser localStorage to Supabase, and to integrate Clerk for user authentication. This migration aims to provide a more robust, scalable, and secure data management solution, enabling user-specific data and future feature enhancements.

## 2. Goals

*   Replace localStorage with Supabase for all application data storage.
*   Implement user authentication using Clerk.
*   Ensure a step-by-step migration process to minimize disruption and allow for continuous testing.
*   Maintain a clear branching strategy to isolate migration work while allowing parallel feature development.
*   Document the migration process and new architecture.
*   **Write tests for every new functionality before proceeding to the next step.**

## 3. Branching Strategy

*   **Main Migration Branch:** A dedicated branch, tentatively named `feat/supabase-clerk-migration`, will be created from `master` (or your current main development branch). All migration and integration work will occur on this branch.
*   **Feature Branches:** Any new, unrelated feature development will occur in separate feature branches, branched off from `master` (or the main development branch).
*   **Integration:** To keep the `feat/supabase-clerk-migration` branch up-to-date and ensure compatibility, changes from completed feature branches (after they are merged to `master`) will be regularly merged into `feat/supabase-clerk-migration`. Alternatively, if features are developed in parallel that *depend* on the migration, they might be branched from `feat/supabase-clerk-migration` itself, but this should be carefully managed. The primary approach is to merge `master` into the migration branch frequently.
*   **Completion:** Once the migration is complete, thoroughly tested, and stable, the `feat/supabase-clerk-migration` branch will be merged into `master`.

## 4. Migration Phases

The migration will be performed incrementally.

### Phase 1: Supabase Setup and Initial Data Model Migration

#### Step 1.1: Create Migration Branch
**Action:** Create the feature branch for migration work.
```bash
git checkout -b feat/supabase-clerk-migration
```
**Success Criteria:** Branch created and pushed to remote.

#### Step 1.2: Supabase Project Setup

**Actions:**
1. Go to https://supabase.com and create a new project
2. Note down the project URL and anon key from Settings > API
3. Create `.env.local` file in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
4. Add `.env.local` to `.gitignore` if not already present
5. Install Supabase client:
```bash
npm install @supabase/supabase-js
```
6. Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Tests Required:**
- Create `src/lib/supabase.test.ts` to verify client initialization
- Test that environment variables are properly loaded

**Success Criteria:** 
- Supabase project created
- Environment variables configured
- Client library installed and initialized
- Tests passing

#### Step 1.3: Create Database Schema

**Action:** Execute the following SQL in Supabase SQL Editor (in order):

##### 1.3.1: Create Users Table (Internal User Management)
```sql
-- Create internal users table for vendor-agnostic user management
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_auth_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX idx_users_clerk_auth_id ON public.users(clerk_auth_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only see their own data)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = clerk_auth_id);
```

##### 1.3.2: Create Players Table
```sql
CREATE TABLE public.players (
  id TEXT PRIMARY KEY, -- Keep TEXT to maintain existing IDs
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  jersey_number TEXT,
  notes TEXT,
  is_goalie BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for user lookups
CREATE INDEX idx_players_user_id ON public.players(user_id);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage own players" ON public.players
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );
```

##### 1.3.3: Create App Settings Table
```sql
CREATE TABLE public.app_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_game_id TEXT,
  other_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own data" ON public.app_settings
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );
```

### 1.3.1. Proposed Supabase Table Structures

Based on the investigation of `localStorage` usage, the following tables are proposed. All tables should also include a `user_id UUID REFERENCES public.users(id) ON DELETE CASCADE` column to scope data to individual users. Timestamps like `created_at` and `updated_at` (defaulting to `now()`) are recommended for all tables.

**Internal User ID Strategy:**
To ensure long-term flexibility and avoid vendor lock-in with Clerk (or any authentication provider), the application will adopt an internal User ID strategy. This involves:
1.  Creating a dedicated `users` table in Supabase. This table will store our application's internal `user_id` (e.g., a UUID generated by Supabase) as its primary key.
2.  This `users` table will also include a column (e.g., `clerk_auth_id` or `auth_provider_user_id`) to store the unique user identifier provided by Clerk.
3.  All other application tables (e.g., `saved_games`, `players`) that store user-specific data will use our internal `user_id` as the foreign key.
4.  Logic will be implemented (e.g., on first login or via Clerk webhooks) to create an entry in our `users` table and link the Clerk ID to our internal ID.
This approach decouples the application's core data model from the authentication provider, making future migrations or changes to authentication easier. The `user_id` columns mentioned in the table definitions below will refer to this internal application `user_id`.

**Standard Row Level Security (RLS) Policy:** For each table containing user-specific data, a policy similar to the following should be implemented:
```sql
CREATE POLICY "Users can manage their own data" ON table_name 
FOR ALL USING (
  user_id IN (
    SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
  )
);
```

**0. `users` (Internal User Management)**

Stores the internal user records that map to external auth providers.

| Column          | Data Type                  | Constraints/Notes                                            |
|-----------------|----------------------------|--------------------------------------------------------------|
| `id`            | `UUID`                     | Primary Key, auto-generated                                  |
| `clerk_auth_id` | `TEXT`                     | UNIQUE, NOT NULL (Clerk's user ID)                         |
| `email`         | `TEXT`                     | NULLABLE (for future use)                                   |
| `created_at`    | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |
| `updated_at`    | `TIMESTAMP WITH TIME ZONE` | NOT NULL, DEFAULT `now()`                                   |
| `last_login_at` | `TIMESTAMP WITH TIME ZONE` | NULLABLE                                                    |
| `metadata`      | `JSONB`                    | DEFAULT '{}' (for future extensibility)                     |

**1. `players` (Master Roster)**

Stores the master list of all players available to a user.

| Column          | Data Type                  | Constraints/Notes                                            |
|-----------------|----------------------------|--------------------------------------------------------------|
| `id`            | `TEXT`                     | Primary Key (keep TEXT for existing string IDs)             |
| `user_id`       | `UUID`                     | Foreign Key to `public.users(id)` ON DELETE CASCADE         |
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
| `user_id`             | `UUID`                     | Primary Key, Foreign Key to `public.users(id)`                            |
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
| `user_id`    | `UUID`                     | Foreign Key to `public.users(id)`                             |
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
| `user_id`    | `UUID`                     | Foreign Key to `public.users(id)`                             |
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
| `user_id`                          | `UUID`                     | Foreign Key to `public.users(id)`                             |
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

#### Step 1.4: Implement First Entity Migration (Seasons)

**Why Seasons First:** Seasons is a simple entity with no dependencies, making it ideal for establishing the migration pattern.

##### Step 1.4.1: Create Supabase Service for Seasons

**Action:** Create `src/utils/supabase/seasons.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';

export interface SupabaseSeason {
  id: string;
  user_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  details?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Get all seasons for the authenticated user
export const getSupabaseSeasons = async (userId: string): Promise<Season[]> => {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to app format
    return (data || []).map(s => ({
      id: s.id,
      name: s.name
    }));
  } catch (error) {
    console.error('[getSupabaseSeasons] Error:', error);
    throw error;
  }
};

// Create a new season
export const createSupabaseSeason = async (userId: string, season: Omit<Season, 'id'>): Promise<Season> => {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .insert({
        id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user_id: userId,
        name: season.name
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name
    };
  } catch (error) {
    console.error('[createSupabaseSeason] Error:', error);
    throw error;
  }
};

// Update existing season
export const updateSupabaseSeason = async (userId: string, season: Season): Promise<Season> => {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .update({ name: season.name, updated_at: new Date().toISOString() })
      .eq('id', season.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name
    };
  } catch (error) {
    console.error('[updateSupabaseSeason] Error:', error);
    throw error;
  }
};

// Delete a season
export const deleteSupabaseSeason = async (userId: string, seasonId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId)
      .eq('user_id', userId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('[deleteSupabaseSeason] Error:', error);
    throw error;
  }
};
```

##### Step 1.4.2: Create Tests for Supabase Seasons Service

**Action:** Create `src/utils/supabase/seasons.test.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import {
  getSupabaseSeasons,
  createSupabaseSeason,
  updateSupabaseSeason,
  deleteSupabaseSeason
} from './seasons';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('Supabase Seasons Service', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupabaseSeasons', () => {
    it('should fetch seasons for a user', async () => {
      const mockSeasons = [
        { id: 's1', user_id: mockUserId, name: 'Spring 2024' },
        { id: 's2', user_id: mockUserId, name: 'Summer 2024' }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSeasons, error: null })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await getSupabaseSeasons(mockUserId);

      expect(supabase.from).toHaveBeenCalledWith('seasons');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toEqual([
        { id: 's1', name: 'Spring 2024' },
        { id: 's2', name: 'Summer 2024' }
      ]);
    });

    it('should handle errors', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(getSupabaseSeasons(mockUserId)).rejects.toThrow('Database error');
    });
  });

  // Add tests for create, update, delete...
});
```

**Success Criteria:**
- Supabase service created with full CRUD operations
- All tests passing
- Error handling implemented

##### Step 1.4.3: Create Migration Component

**Action:** Create `src/components/DataMigration/SeasonsMigration.tsx`:

```typescript
import React, { useState } from 'react';
import { getSeasons as getLocalSeasons } from '@/utils/seasons';
import { createSupabaseSeason } from '@/utils/supabase/seasons';
import { removeLocalStorageItemAsync } from '@/utils/localStorage';
import { SEASONS_LIST_KEY } from '@/config/constants';

interface SeasonsMigrationProps {
  userId: string;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export const SeasonsMigration: React.FC<SeasonsMigrationProps> = ({
  userId,
  onComplete,
  onError
}) => {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const migrateSeasons = async () => {
    try {
      setStatus('migrating');
      
      // Get local seasons
      const localSeasons = await getLocalSeasons();
      setProgress({ current: 0, total: localSeasons.length });

      if (localSeasons.length === 0) {
        setStatus('complete');
        onComplete();
        return;
      }

      // Migrate each season
      for (let i = 0; i < localSeasons.length; i++) {
        const season = localSeasons[i];
        setProgress({ current: i + 1, total: localSeasons.length });
        
        try {
          await createSupabaseSeason(userId, { name: season.name });
        } catch (error) {
          console.error(`Failed to migrate season "${season.name}":`, error);
          // Continue with other seasons
        }
      }

      // Clear local storage
      await removeLocalStorageItemAsync(SEASONS_LIST_KEY);
      
      setStatus('complete');
      onComplete();
    } catch (error) {
      console.error('Seasons migration failed:', error);
      setStatus('error');
      onError(error as Error);
    }
  };

  React.useEffect(() => {
    if (status === 'idle') {
      migrateSeasons();
    }
  }, [status]);

  if (status === 'error') {
    return <div>Error migrating seasons. Please try again.</div>;
  }

  if (status === 'complete') {
    return <div>Seasons migrated successfully!</div>;
  }

  return (
    <div>
      <h3>Migrating Seasons...</h3>
      <p>Progress: {progress.current} / {progress.total}</p>
    </div>
  );
};
```

##### Step 1.4.4: Create Tests for Migration Component

**Action:** Create `src/components/DataMigration/SeasonsMigration.test.tsx`:

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SeasonsMigration } from './SeasonsMigration';
import { getSeasons } from '@/utils/seasons';
import { createSupabaseSeason } from '@/utils/supabase/seasons';
import { removeLocalStorageItemAsync } from '@/utils/localStorage';

jest.mock('@/utils/seasons');
jest.mock('@/utils/supabase/seasons');
jest.mock('@/utils/localStorage');

describe('SeasonsMigration', () => {
  const mockUserId = 'test-user-123';
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should migrate seasons successfully', async () => {
    const mockSeasons = [
      { id: 's1', name: 'Spring 2024' },
      { id: 's2', name: 'Summer 2024' }
    ];

    (getSeasons as jest.Mock).mockResolvedValue(mockSeasons);
    (createSupabaseSeason as jest.Mock).mockResolvedValue({});
    (removeLocalStorageItemAsync as jest.Mock).mockResolvedValue(undefined);

    render(
      <SeasonsMigration
        userId={mockUserId}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Migrating Seasons...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Seasons migrated successfully!')).toBeInTheDocument();
    });

    expect(createSupabaseSeason).toHaveBeenCalledTimes(2);
    expect(removeLocalStorageItemAsync).toHaveBeenCalledWith('soccerSeasons');
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });

  // Add more test cases...
});
```

##### Step 1.4.5: Update Seasons Utility to Use Supabase

**Action:** Modify `src/utils/seasons.ts` to check for user authentication and use Supabase:

```typescript
import { SEASONS_LIST_KEY } from '@/config/constants';
import type { Season } from '@/types';
import { 
  getSupabaseSeasons, 
  createSupabaseSeason, 
  updateSupabaseSeason, 
  deleteSupabaseSeason 
} from './supabase/seasons';

// Check if we have a user context (will be implemented with Clerk)
const getUserId = (): string | null => {
  // TODO: This will be replaced with Clerk's useUser hook
  return null;
};

export const getSeasons = async (): Promise<Season[]> => {
  const userId = getUserId();
  
  // If authenticated, use Supabase
  if (userId) {
    return getSupabaseSeasons(userId);
  }
  
  // Otherwise, fall back to localStorage (existing implementation)
  try {
    const seasonsJson = localStorage.getItem(SEASONS_LIST_KEY);
    if (!seasonsJson) {
      return Promise.resolve([]);
    }
    return Promise.resolve(JSON.parse(seasonsJson) as Season[]);
  } catch (error) {
    console.error('[getSeasons] Error reading seasons from localStorage:', error);
    return Promise.resolve([]);
  }
};

// Similar updates for addSeason, updateSeason, deleteSeason...
```

**Success Criteria:**
- Migration component created and tested
- Seasons utility updated to support both localStorage and Supabase
- All existing tests still pass
- New tests for Supabase functionality pass

#### Step 1.5: Migration Order and Dependencies

**Mandatory Migration Order:**
1. **Seasons** (no dependencies) ✓
2. **Tournaments** (no dependencies)
3. **Players** (master roster, no dependencies)
4. **App Settings** (may reference game IDs but not critical)
5. **Saved Games** (depends on seasons, tournaments, and players)

**Each entity migration must:**
1. Create Supabase service with CRUD operations
2. Write comprehensive tests for the service
3. Create migration component with progress tracking
4. Test the migration component
5. Update existing utility to support both backends
6. Ensure all existing tests still pass

### Phase 2: Remaining Data Models Migration

[Continue with similar detailed steps for each entity...]

### Phase 3: Clerk Authentication Integration

#### Step 3.1: Install and Configure Clerk

**Actions:**
1. Create Clerk application at https://clerk.com
2. Install Clerk SDK:
```bash
npm install @clerk/nextjs
```
3. Add environment variables to `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```
4. Create `src/app/layout.tsx` wrapper:
```typescript
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**Tests Required:**
- Test that ClerkProvider is properly configured
- Test that environment variables are loaded

[Continue with detailed steps...]

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