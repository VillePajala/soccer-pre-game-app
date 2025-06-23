export const queryKeys = {
  masterRoster: ['masterRoster'] as const,
  seasons: ['seasons'] as const,
  tournaments: ['tournaments'] as const,
  savedGames: ['savedGames'] as const,
  appSettingsCurrentGameId: ['appSettingsCurrentGameId'] as const,
  // Example for a detail query if needed later:
  // gameById: (gameId: string) => ['games', 'detail', gameId] as const,
}; 