/** Correction de score par l'administrateur sur un match de la séance. */
export interface TrainingScoreUpdate {
  matchId: string;
  scoreA: number;
  scoreB: number;
}

/** Création d'une équipe fixe, qui restera ensemble sur toute la séance. */
export interface TrainingTeamCreation {
  participantIds: string[];
  name?: string;
}
