export type CompetitionMode = 'standard' | 'up_down' | 'championship';
export type ScoreCalculation =
  'victory_ga' | 'score' | 'tournament_score' | 'victory_buchholz_ga' | 'score_buchholz_ga';

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
  hasConsolanteTable?: boolean;
  hasChallengePrincipaleTable?: boolean;
  hasChallengeConsolanteTable?: boolean;
  hasThirdPlaceMatch?: boolean;
  principalBracketSize?: number;
  numberOfQualifyingRounds?: number;
  numberOfPools?: number;
}

/** How the up-down rounds after the first one are paired. */
export type PairingMode = 'random' | 'dutch';

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
