import { TrainingTeamComposition } from 'src/enum/training.enum';

export interface GenerateRoundInput {
    fixedTeams: { id: string; participantIds: string[] }[];
    soloParticipantIds: string[];
    config: {
        /** Taille visée pour les équipes formées à chaque round. */
        playersPerTeam: number;
        /** Tailles que le générateur peut aussi utiliser, taille visée comprise. */
        allowedTeamSizes: number[];
        /**
         * Arbitrage rendu une fois pour toutes à la création de la séance, pour que le
         * générateur n'ait jamais de question à poser :
         * - `false` (« tout le monde joue ») : vider le banc prime sur la taille des équipes ;
         * - `true` (« rester sur le nombre de joueurs ») : la taille prime, les joueurs en trop
         *   se reposent à tour de rôle.
         */
        preferTargetTeamSize: boolean;
        /** Nombre de matchs simultanés possibles : les équipes en trop attendent le round suivant. */
        plateCount: number;
        teamComposition: TrainingTeamComposition;
        avoidSamePartnerConsecutive: boolean;
        avoidSameOpponentConsecutive: boolean;
    };
    history: {
        /**
         * Rounds passés, du plus récent au plus ancien. La stratégie décide elle-même jusqu'où
         * remonter : avec beaucoup de joueurs on peut exiger une rotation large, avec quatre
         * joueurs la contrainte devient impossible et doit se relâcher.
         */
        recentRounds: {
            partnerPairs: [string, string][];
            // Identité CANONIQUE d'une équipe, PAS l'id de TrainingTeam éphémère (qui change à
            // chaque round et ne peut donc jamais matcher d'un round à l'autre) : fixedTeamId pour
            // une équipe fixe, ou le set trié des participantIds joint par ',' pour une éphémère.
            opponentCanonicalPairs: [string, string][];
        }[];
        /** Nombre de rounds passés au repos, par participant. Absent = jamais reposé. */
        sitOutCountByParticipant: Record<string, number>;
    };
    /**
     * Niveau estimé de chaque participant, plus la valeur est haute plus le joueur est fort.
     * Un participant absent de cette table est inconnu (invité, ou joueur qui n'a pas encore
     * disputé de match) et sera placé dans le bas du classement, sans être dernier.
     */
    levelByParticipant: Record<string, number>;
}

export interface RoundPlan {
    // Inclut les équipes d'un seul joueur créées pour les participants mis au repos : le repos
    // n'est pas une absence du plan mais une équipe sans adversaire, ce qui le rend persistable
    // et diffusable comme n'importe quel match.
    ephemeralTeams: { tempId: string; participantIds: string[] }[];
    // Une entrée par match : teamRef = fixedTeamId ou tempId côté A, opponentRef = idem côté B
    // (null = bye, qu'il s'agisse d'une équipe exemptée ou d'un joueur au repos).
    matches: { teamRef: string; opponentRef: string | null }[];
}

export const MATCHMAKING_PORT = Symbol('MATCHMAKING_PORT');

export interface MatchmakingPort {
    generateRound(input: GenerateRoundInput): RoundPlan;
}
