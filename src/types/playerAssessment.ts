export interface PlayerAssessment {
  overall: number;
  sliders: {
    intensity: number;
    courage: number;
    duels: number;
    technique: number;
    creativity: number;
    decisions: number;
    awareness: number;
    teamwork: number;
    fair_play: number;
    impact: number;
  };
  notes: string;
  minutesPlayed: number;
  createdAt: number;
  createdBy: string;
}
