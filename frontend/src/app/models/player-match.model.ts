export interface PlayerMatchDto {
  id: string;
  status: string;
  isBye: boolean;
  scoreA: number;
  scoreB: number;
  plateNumber: number | null;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string } | null;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  session: { id: string; sessionNumber: number };
}

export interface MatchHistoryDto {
  matchId: string;
  sessionNumber: number;
  teamName: string;
  teamScore: number;
  opponentName: string;
  opponentScore: number;
  outcome: 'win' | 'draw' | 'loss' | 'bye';
}
