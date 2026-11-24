import { CompetitionMode, SpecificTournamentConfig } from './tournament-configuration-detail.model';

/** Ratios (count / capacity) at which a bracket is considered full enough or only partly filled. */
export interface FillThresholds {
  okRatio: number;
  warningRatio: number;
}

export type FillLevel = 'ok' | 'mid' | 'low';

/** One bracket of the split: `count` teams in a bracket of `capacity` slots (a power of 2). */
export interface BracketSize {
  capacity: number;
  count: number;
  /** True for the bracket added on top of the target layout to host the surplus teams. */
  extra?: boolean;
}

/** One elimination round of a bracket. */
export interface BracketRound {
  teams: number;
  matches: number;
  byes: number;
  losers: number;
  /** Best losers brought back to fill the second round of a partial bracket. */
  bestLosersIn: number;
}

/** Everything `computeStructuredPlan` needs: the registered teams, the configuration, the settings. */
export interface StructuredPlanInput {
  teamCount: number;
  targetCount: number;
  consolationCount: number;
  numberOfQualifyingRounds: number;
  hasChallenges: boolean;
  hasThirdPlaceMatch: boolean;
  /** Last-ranked teams of the qualifiers that play no elimination match. */
  eliminatedAfterQualifying: number;
  maxConsolations: number;
  thresholds: FillThresholds;
}

/** A main or consolation bracket of the plan. */
export interface PlanBracket {
  key: string;
  label: string;
  capacity: number;
  teamCount: number;
  fillRatio: number;
  fillLevel: FillLevel;
  /** True for the consolation added on top of the target layout for the surplus teams. */
  extra: boolean;
  /** Best losers brought back at the end of the bracket's first round. */
  bestLosersFirstRound: number;
}

export type PlanRoundKind = 'qualifying' | 'elimination';

export type PlanGroupKind = 'qualifying' | 'main' | 'consolation' | 'challenge' | 'third_place';

/** One bracket / challenge / 3rd place match (or the qualifying pool) in one round. */
export interface PlanGroup {
  key: string;
  label: string;
  kind: PlanGroupKind;
  teamCount: number;
  matchCount: number;
  byeCount: number;
  /** Best losers brought back at the end of this round to complete the group. */
  bestLosersIn: number;
  plateStart: number;
  plateEnd: number;
}

export interface PlanRound {
  number: number;
  kind: PlanRoundKind;
  label: string;
  groups: PlanGroup[];
}

export type PlanWarningCode =
  'LOW_FILL' | 'MID_FILL' | 'EXTRA_BRACKET' | 'IMPOSSIBLE' | 'BRACKET_TOO_SMALL' | 'NO_THIRD_PLACE';

export type PlanWarningLevel = 'info' | 'warning' | 'error';

export interface PlanWarning {
  code: PlanWarningCode;
  level: PlanWarningLevel;
  /** French, shown as is. */
  message: string;
  bracketKey?: string;
  /** IMPOSSIBLE only: the consolation counts that work for this team count. */
  validConsolationCounts?: number[];
}

/** Team counts the target layout handles comfortably, with its plain-words explanation. */
export interface ComfortRange {
  /** Sum of the target layout capacities: every bracket is full. */
  optimalCount: number;
  /** Lowest team count keeping the same brackets without a low fill. */
  okFrom: number;
  text: string;
}

export type PlanOptionId = 'keep' | 'recalculate' | 'add_consolation' | 'stop_last';

/** A launch choice, with the configuration to write and its own plan. */
export interface PlanOption {
  id: PlanOptionId;
  label: string;
  description: string;
  recommended: boolean;
  consolationCount: number;
  eliminatedAfterQualifying: number;
  plan: Omit<TournamentPlan, 'options'>;
}

export interface TournamentPlan {
  /** Teams playing the elimination brackets (registered teams minus the stopped ones). */
  teamCount: number;
  eliminatedAfterQualifying: number;
  brackets: PlanBracket[];
  rounds: PlanRound[];
  totalRounds: number;
  maxPlates: number;
  warnings: PlanWarning[];
  comfort: ComfortRange | null;
  /** Launch options; only on the top-level plan (empty on the plans of the options). */
  options: PlanOption[];
}

/** Body of `POST /tournaments/plan-preview`: the plan of a configuration that is not saved yet. */
export interface PlanPreviewBody {
  competitionMode: CompetitionMode;
  competitionConfiguration: SpecificTournamentConfig;
  teamCount: number;
  targetCount: number;
}

/** Body of `POST /tournaments/:code/start`: the launch choice is optional. */
export interface StartTournamentBody {
  password: string;
  /** Team count of the launch check: a different count refuses the start (409). */
  expectedTeamCount?: number;
  consolationCount?: number;
  /** The last X teams of the qualifiers play no elimination match. */
  eliminatedAfterQualifying?: number;
}
