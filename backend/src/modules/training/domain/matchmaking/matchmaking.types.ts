export interface GenerateRoundInput {
    fixedTeams: { id: string; participantIds: string[] }[];
    soloParticipantIds: string[];
    config: {
        playersPerTeam: number;
        fallbackTeamSize: number;
        allowSitOut: boolean;
        avoidSamePartnerConsecutive: boolean;
        avoidSameOpponentConsecutive: boolean;
    };
    history: {
        // Un seul round de recul (N-1) — cohérent avec la sémantique "…Consecutive" des deux
        // contraintes ci-dessus, qui ne portent que sur le round immédiatement précédent.
        previousRoundPartnerPairs: [string, string][];
        // Identité CANONIQUE d'une équipe, PAS l'id de TrainingTeam éphémère (qui change à chaque
        // round et ne peut donc jamais matcher d'un round à l'autre) : fixedTeamId pour une équipe
        // fixe, ou le set trié des participantIds joint par ',' pour une équipe éphémère.
        previousRoundOpponentCanonicalPairs: [string, string][];
    };
}

export interface RoundPlan {
    ephemeralTeams: { tempId: string; participantIds: string[] }[];
    // Une entrée par match : teamRef = fixedTeamId ou tempId côté A, opponentRef = idem côté B
    // (null = bye).
    matches: { teamRef: string; opponentRef: string | null }[];
}

export const MATCHMAKING_PORT = Symbol('MATCHMAKING_PORT');

export interface MatchmakingPort {
    generateRound(input: GenerateRoundInput): RoundPlan;
}
