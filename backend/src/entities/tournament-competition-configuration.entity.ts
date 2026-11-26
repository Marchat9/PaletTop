import { EliminationSeeding, PairingMode } from 'src/enum/tounament.enum';
import { TournamentPlan } from 'src/modules/tournaments/strategies/structured/plan/plan.types';

export abstract class TournamentCompetitionConfiguration {}

/**
 * Stored in the tournament's jsonb configuration: these classes only describe its shape, they are
 * not entities. `eliminatedAfterQualifying` and `plan` are written by the backend at launch only,
 * never taken from a request.
 */
export class StructuredCompetitionConfiguration extends TournamentCompetitionConfiguration {
    numberOfQualifyingRounds!: number;

    /** Consolation brackets under the main one (0 = main bracket only). */
    consolationCount!: number;

    /** One challenge per bracket (main and each consolation). */
    hasChallenges!: boolean;

    /** Main bracket only. */
    hasThirdPlaceMatch!: boolean;

    /**
     * How the elimination rounds are paired. Missing on tournaments created before the option
     * existed: read as RANDOM.
     */
    eliminationPairingMode?: PairingMode;

    /**
     * How the first round of each elimination bracket is placed. Missing on tournaments created
     * before the option existed: read as PYRAMIDAL.
     */
    eliminationSeeding?: EliminationSeeding;

    /** The last X teams of the qualifiers play no elimination match. */
    eliminatedAfterQualifying?: number;

    /** Frozen at launch: the plan the elimination phase follows. */
    plan?: Omit<TournamentPlan, 'options'>;
}

export class UpDownCompetitionConfiguration extends TournamentCompetitionConfiguration {
    numberOfRound?: number;

    lastRoundByRanking?: boolean;

    /** Missing on tournaments created before the pairing mode existed: read as RANDOM. */
    pairingMode?: PairingMode;
}

export class ChampionShipCompetitionConfiguration extends TournamentCompetitionConfiguration {
    homeClub!: string;

    awayClub!: string;
}
