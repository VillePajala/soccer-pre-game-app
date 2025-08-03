/**
 * React Query optimization settings for better performance
 */

export const queryOptimizations = {
  // Master roster - changes infrequently
  masterRoster: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Saved games - changes frequently but not critical to refetch constantly
  savedGames: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always' as const,
  },
  
  // Seasons - rarely changes
  seasons: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Tournaments - rarely changes
  tournaments: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Current game ID - critical, always fresh
  appSettingsCurrentGameId: {
    staleTime: 0, // Always stale
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always' as const,
  },
};

/**
 * Enable suspense for better loading states
 */
export const suspenseConfig = {
  masterRoster: { suspense: false }, // Don't suspend for roster
  savedGames: { suspense: false }, // Don't suspend for games list
  seasons: { suspense: false },
  tournaments: { suspense: false },
};