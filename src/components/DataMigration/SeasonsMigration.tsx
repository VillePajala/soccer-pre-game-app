import React, { useState, useEffect } from 'react';
// Assuming getLocalSeasons is your existing localStorage access function for seasons
// and it needs to be adapted or correctly pathed.
// For example, if it was in src/utils/seasons.ts and exported as getSeasons:
import { getSeasons as getLocalSeasons } from '@/utils/seasons'; 
import { createSupabaseSeason } from '@/utils/supabase/seasons';
// Assuming this utility exists or will be created:
import { removeLocalStorageItemAsync } from '@/utils/localStorage'; 
// Assuming this constant is defined:
import { SEASONS_LIST_KEY } from '@/config/constants'; 
import type { Season } from '@/types'; // Your application's Season type

interface SeasonsMigrationProps {
  // The userId here should be the internal Supabase user_id (UUID)
  // that has been created in your public.users table and linked to the Clerk user.
  // This component should only be rendered *after* you have this internal ID.
  userId: string; 
  onComplete: () => void;
  onError: (error: Error) => void;
}

export const SeasonsMigration: React.FC<SeasonsMigrationProps> = ({
  userId,
  onComplete,
  onError,
}) => {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const migrateSeasons = async () => {
      if (!userId) {
        setStatus('error');
        setErrorDetail("Migration cannot start without a valid user ID.");
        onError(new Error("Migration cannot start without a valid user ID."));
        return;
      }
      
      try {
        setStatus('migrating');
        setErrorDetail(null);
        
        // Get local seasons
        const localSeasons: Season[] = await getLocalSeasons(); // Ensure this returns Season[]
        
        if (!localSeasons || localSeasons.length === 0) {
          setProgress({ current: 0, total: 0 });
          setStatus('complete');
          onComplete();
          return;
        }
        
        setProgress({ current: 0, total: localSeasons.length });

        // Migrate each season
        for (let i = 0; i < localSeasons.length; i++) {
          const localSeason = localSeasons[i];
          try {
            // createSupabaseSeason expects Omit<Season, 'id'>
            // If your localSeason objects fit this (e.g. they are just { name: '...'}),
            // or if createSupabaseSeason is adapted, this will work.
            // Otherwise, map localSeason to the expected input.
            const seasonDataToCreate: Omit<Season, 'id'> = {
              name: localSeason.name,
              // Map other fields if your Season type and createSupabaseSeason expect them
              // e.g., startDate: localSeason.startDate, details: localSeason.details
            };
            await createSupabaseSeason(seasonDataToCreate); // Pass the data, userId is handled internally by createSupabaseSeason via getCurrentSupabaseUserId
          } catch (indivError) {
            console.error(`Failed to migrate season "${localSeason.name}":`, indivError);
            // Decide on error strategy: continue, or halt and report?
            // For now, continuing with others.
          }
          setProgress({ current: i + 1, total: localSeasons.length });
        }

        // Clear local storage only if all migrations for this entity were successful
        // or based on your chosen error strategy.
        // For now, clearing regardless of individual errors, as per original plan.
        await removeLocalStorageItemAsync(SEASONS_LIST_KEY); 
        
        setStatus('complete');
        onComplete();
      } catch (error) {
        console.error('Seasons migration failed:', error);
        setErrorDetail((error as Error).message || "An unknown error occurred during migration.");
        setStatus('error');
        onError(error as Error);
      }
    };

    if (status === 'idle') {
      migrateSeasons();
    }
  }, [status, userId, onComplete, onError]); // Added dependencies

  if (status === 'error') {
    return <div>Error migrating seasons: {errorDetail || 'Please try again or check console.'}</div>;
  }

  if (status === 'complete') {
    return <div>Seasons migrated successfully!</div>;
  }

  return (
    <div>
      <h3>Migrating Seasons...</h3>
      <p>Progress: {progress.current} / {progress.total}</p>
      {/* You might want to add a loading spinner or more detailed status */}
    </div>
  );
}; 