export interface Player {
  id: string;
  name: string; // Full name
  nickname?: string; // Optional nickname (e.g., first name) for display on disc
  relX?: number; // Relative X (0.0 to 1.0)
  relY?: number; // Relative Y (0.0 to 1.0)
  color?: string; // Optional: Specific color for the disk
  isGoalie?: boolean; // Optional: Is this player the goalie?
  jerseyNumber?: string; // Optional: Player's jersey number
  notes?: string; // Optional: Notes specific to this player
  receivedFairPlayCard?: boolean; // Optional: Did this player receive the fair play card?
}

export interface PlayerStatRow extends Player {
  goals: number;
  assists: number;
  totalScore: number;
  fpAwards?: number;
  gamesPlayed: number;
  avgPoints: number;
}

export interface Season {
  id: string; 
  name: string; 
}

export interface Tournament {
  id: string;
  name: string;
}

export * from './playerAssessment';
export * from "./game";
