import { z } from 'zod';

export const pointSchema = z.object({
  relX: z.number(),
  relY: z.number(),
});

export const opponentSchema = z.object({
  id: z.string(),
  relX: z.number(),
  relY: z.number(),
});

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickname: z.string().optional(),
  relX: z.number().optional(),
  relY: z.number().optional(),
  color: z.string().optional(),
  isGoalie: z.boolean().optional(),
  jerseyNumber: z.string().optional(),
  notes: z.string().optional(),
  receivedFairPlayCard: z.boolean().optional(),
});

export const gameEventSchema = z.object({
  id: z.string(),
  type: z.enum(['goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard']),
  time: z.number(),
  scorerId: z.string().optional(),
  assisterId: z.string().optional(),
  entityId: z.string().optional(),
});

export const intervalLogSchema = z.object({
  period: z.number(),
  duration: z.number(),
  timestamp: z.number(),
});

export const tacticalDiscSchema = z.object({
  id: z.string(),
  relX: z.number(),
  relY: z.number(),
  type: z.enum(['home', 'opponent', 'goalie']),
});

export const playerAssessmentSchema = z.object({
  overall: z.number(),
  sliders: z.object({
    intensity: z.number(),
    courage: z.number(),
    duels: z.number(),
    technique: z.number(),
    creativity: z.number(),
    decisions: z.number(),
    awareness: z.number(),
    teamwork: z.number(),
    fair_play: z.number(),
    impact: z.number(),
  }),
  notes: z.string(),
  minutesPlayed: z.number(),
  createdAt: z.number(),
  createdBy: z.string(),
});

export const appStateSchema = z.object({
  playersOnField: z.array(playerSchema),
  opponents: z.array(opponentSchema),
  drawings: z.array(z.array(pointSchema)),
  availablePlayers: z.array(playerSchema),
  showPlayerNames: z.boolean(),
  teamName: z.string(),
  gameEvents: z.array(gameEventSchema),
  opponentName: z.string(),
  gameDate: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  gameNotes: z.string(),
  homeOrAway: z.enum(['home', 'away']),
  numberOfPeriods: z.union([z.literal(1), z.literal(2)]),
  periodDurationMinutes: z.number(),
  currentPeriod: z.number(),
  gameStatus: z.enum(['notStarted', 'inProgress', 'periodEnd', 'gameEnd']),
  selectedPlayerIds: z.array(z.string()),
  assessments: z.record(z.string(), playerAssessmentSchema).optional(),
  seasonId: z.string(),
  tournamentId: z.string(),
  tournamentLevel: z.string().optional(),
  ageGroup: z.string().optional(),
  gameLocation: z.string().optional(),
  gameTime: z.string().optional(),
  subIntervalMinutes: z.number().optional(),
  completedIntervalDurations: z.array(intervalLogSchema).optional(),
  lastSubConfirmationTimeSeconds: z.number().optional(),
  tacticalDiscs: z.array(tacticalDiscSchema),
  tacticalDrawings: z.array(z.array(pointSchema)),
  tacticalBallPosition: pointSchema.nullable(),
  isPlayed: z.boolean().optional(),
});

export type AppStateSchema = typeof appStateSchema;
export type AppStateSchemaType = z.infer<typeof appStateSchema>;
