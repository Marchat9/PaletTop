/** Score correction by the admin on a session match. */
export interface TrainingScoreUpdate {
  matchId: string;
  scoreA: number;
  scoreB: number;
}

/** Creation of a fixed team, which will stay together for the whole session. */
export interface TrainingTeamCreation {
  participantIds: string[];
  name?: string;
}
