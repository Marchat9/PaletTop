export type CompetitionMode = 'standard' | 'up_down' | 'championship';
export type ScoreCalculation = 'victory_ga' | 'score' | 'tournament_score';

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

export interface UpDownTournamentConfig extends SpecificTournamentConfig {
  numberOfRound?: number;
}

export interface ChampionShipTournamentConfig extends SpecificTournamentConfig {
  homeClub: string;
  awayClub: string;
}
