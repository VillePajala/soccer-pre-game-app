import { useEffect, useState } from 'react';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { getSavedGames, getMostRecentGameId } from '@/utils/savedGames';
import logger from '@/utils/logger';

export function useResumeAvailability(user: unknown) {
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkResume = async () => {
      // Small delay for auth stabilization
      await new Promise((r) => setTimeout(r, 100));
      try {
        logger.debug('[useResumeAvailability] Checking resumable game. user:', !!user);
        const lastId = await getCurrentGameIdSetting();
        const games = await getSavedGames();
        if (lastId && games[lastId]) {
          if (isMounted) setCanResume(true);
          return;
        }
        const mostRecentId = await getMostRecentGameId();
        if (mostRecentId) {
          if (isMounted) setCanResume(true);
          return;
        }
        if (isMounted) setCanResume(false);
      } catch (error) {
        logger.error('[useResumeAvailability] Error checking resume:', error);
        if (isMounted) setCanResume(false);
      }
    };
    checkResume();
    return () => {
      isMounted = false;
    };
  }, [user]);

  return canResume;
}


