// Classement par PARTICIPANT uniquement (jamais par équipe, même fixe) — décision produit, cf.
// plan de développement. Crédit complet (pas de répartition) à chaque membre d'une équipe gagnante.
export interface TrainingLeaderboardEntryDto {
    participantId: string;
    name: string;
    wins: number;
    points: number;
}
