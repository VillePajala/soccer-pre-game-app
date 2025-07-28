import { useMemo } from 'react';
import { SavedGamesCollection } from '@/types';

type StatsTab = 'currentGame' | 'season' | 'tournament' | 'overall' | 'player';

interface SavedGame {
  homeScore?: number;
  awayScore?: number;
  homeOrAway?: 'home' | 'away';
  isPlayed?: boolean;
}

interface OverallTeamStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winPercentage: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
}

interface UseOverallTeamStatsProps {
  activeTab: StatsTab;
  savedGames: SavedGamesCollection | null;
}

export function useOverallTeamStats({ activeTab, savedGames }: UseOverallTeamStatsProps): OverallTeamStats | null {
  return useMemo(() => {
    if (activeTab !== 'overall') return null;
    
    const playedGameIds = Object.keys(savedGames || {}).filter(
      id => savedGames?.[id]?.isPlayed !== false
    );
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    playedGameIds.forEach(gameId => {
        const game = savedGames?.[gameId] as SavedGame;
        if (!game || typeof game.homeScore !== 'number' || typeof game.awayScore !== 'number') return;
        
        const ourScore = game.homeOrAway === 'home' ? game.homeScore : game.awayScore;
        const theirScore = game.homeOrAway === 'home' ? game.awayScore : game.homeScore;

        goalsFor += ourScore;
        goalsAgainst += theirScore;

        if (ourScore > theirScore) wins++;
        else if (ourScore < theirScore) losses++;
        else ties++;
    });

    const gamesPlayed = playedGameIds.length;
    if (gamesPlayed === 0) return null;

    return {
        gamesPlayed, 
        wins, 
        losses, 
        ties, 
        goalsFor, 
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst,
        winPercentage: (wins / gamesPlayed) * 100,
        averageGoalsFor: goalsFor / gamesPlayed,
        averageGoalsAgainst: goalsAgainst / gamesPlayed,
    };
  }, [activeTab, savedGames]);
}