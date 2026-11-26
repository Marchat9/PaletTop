export type CompetitionMode = 'standard' | 'up_down' | 'championship';
export type ScoreCalculation =
  'victory_goal_average' | 'victory_best_defeats' | 'victory_points_scored' | 'tournament_score';

export interface TournamentConfigurationDetailsDto {
  maxTeamCapacity: number;
  scoreCalculation: ScoreCalculation;
  pointsPerGame: number;
  rematch: boolean;
  matchAgainstFullSameClub: boolean;
  matchAgainstPartialSameClub: boolean;
  competitionMode: CompetitionMode;

  competitionConfiguration: SpecificTournamentConfig;
}

export abstract class SpecificTournamentConfig {}

export interface StructuredTournamentConfig extends SpecificTournamentConfig {
  numberOfQualifyingRounds?: number;
  /** Consolations after the main bracket (« Consolante A », « B »…). */
  consolationCount?: number;
  /** One switch for the challenges of every bracket. */
  hasChallenges?: boolean;
  hasThirdPlaceMatch?: boolean;
  /** How the first round of each elimination bracket is placed. Missing: pyramidal. */
  eliminationSeeding?: EliminationSeeding;
}

/** Pyramidal: seeds by qualifying rank, byes to the best. Random: drawn with the draw constraints. */
export type EliminationSeeding = 'pyramidal' | 'random';

/** How the up-down rounds after the first one are paired. */
export type PairingMode = 'random' | 'dutch' | 'neighbors';

export interface UpDownTournamentConfig extends SpecificTournamentConfig {
  numberOfRound?: number;
  lastRoundByRanking?: boolean;
  /** Missing on tournaments created before the option: random. */
  pairingMode?: PairingMode;
}

export interface ChampionShipTournamentConfig extends SpecificTournamentConfig {
  homeClub: string;
  awayClub: string;
}
