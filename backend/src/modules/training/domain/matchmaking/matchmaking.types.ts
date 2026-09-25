import { TrainingTeamComposition } from 'src/enum/training.enum';

export interface GenerateRoundInput {
    fixedTeams: { id: string; participantIds: string[] }[];
    soloParticipantIds: string[];
    config: {
        /** Target size for the teams built each round. */
        playersPerTeam: number;
        /** Sizes the generator may also use, target size included. */
        allowedTeamSizes: number[];
        /**
         * Trade-off settled once and for all when the session is created, so that the generator
         * never has a question to ask:
         *
         * - `false` ("everyone plays"): emptying the bench wins over team size;
         * - `true` ("keep the team size"): size wins, extra players rest in turn.
         */
        preferTargetTeamSize: boolean;
        /** Number of simultaneous matches allowed: extra teams wait for the next round. */
        plateCount: number;
        teamComposition: TrainingTeamComposition;
        avoidSamePartnerConsecutive: boolean;
        avoidSameOpponentConsecutive: boolean;
    };
    history: {
        /**
         * Past rounds, most recent first. The strategy decides how far back to look: with many
         * players a wide rotation can be required, with four players the constraint becomes
         * impossible and has to be relaxed.
         */
        recentRounds: {
            partnerPairs: [string, string][];
            // CANONICAL identity of a team, NOT the id of the ephemeral TrainingTeam (which changes
            // every round and could therefore never match from one round to the next): fixedTeamId
            // for a fixed team, or the sorted set of participantIds joined by ',' for an ephemeral
            // one.
            opponentCanonicalPairs: [string, string][];
        }[];
        /** Number of rounds spent resting, per participant. Missing = never rested. */
        sitOutCountByParticipant: Record<string, number>;
    };
    /**
     * Estimated level of each participant, the higher the stronger. A participant missing from this
     * map is unknown (guest, or player who has not played a match yet) and is placed low in the
     * ranking, without being last.
     */
    levelByParticipant: Record<string, number>;
}

export interface RoundPlan {
    // Includes the one-player teams built for resting participants: rest is not an absence from the
    // plan but a team without an opponent, which makes it persistable and broadcastable like any
    // match.
    ephemeralTeams: { tempId: string; participantIds: string[] }[];
    // One entry per match: teamRef = fixedTeamId or tempId on side A, opponentRef = the same on
    // side B (null = bye, be it an exempt team or a resting player).
    matches: { teamRef: string; opponentRef: string | null }[];
}

export const MATCHMAKING_PORT = Symbol('MATCHMAKING_PORT');

export interface MatchmakingPort {
    generateRound(input: GenerateRoundInput): RoundPlan;
}
