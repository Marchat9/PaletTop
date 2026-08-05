export interface ScoreUpdate {
  matchId: string;
  scoreA: number;
  scoreB: number;
}

export interface TeamScoreUpdate {
  matchId: string;
  teamCode: string;
  scoreA: number;
  scoreB: number;
}
