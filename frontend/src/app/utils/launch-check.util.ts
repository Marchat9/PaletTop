import { StructuredTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import {
  FillLevel,
  LaunchChoice,
  PlanOption,
  PlanPreviewBody,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

/**
 * Request of the launch check: the saved configuration with the teams registered right now. Null
 * for a mode without a plan, which starts with its plain confirmation.
 */
export function buildLaunchPlanBody(tournament: TournamentDto): PlanPreviewBody | null {
  const { configuration, teams } = tournament;
  if (configuration.competitionMode !== 'standard') {
    return null;
  }
  return {
    competitionMode: configuration.competitionMode,
    competitionConfiguration: configuration.competitionConfiguration,
    teamCount: teams.length,
    targetCount: configuration.maxTeamCapacity,
  };
}

/** What the start request carries when the admin picked this option. */
export function launchChoiceOfOption(option: PlanOption, expectedTeamCount: number): LaunchChoice {
  return {
    expectedTeamCount,
    consolationCount: option.consolationCount,
    eliminatedAfterQualifying: option.eliminatedAfterQualifying,
  };
}

/** What the start request carries when the count is the planned one: the saved configuration. */
export function launchChoiceOfConfiguration(
  tournament: TournamentDto,
  expectedTeamCount: number,
): LaunchChoice {
  const { consolationCount } = tournament.configuration
    .competitionConfiguration as StructuredTournamentConfig;
  return { expectedTeamCount, consolationCount, eliminatedAfterQualifying: 0 };
}

/** A plan with at least one bracket: an impossible one has none and the start refuses it. */
export function isPlanPossible(plan: Pick<TournamentPlan, 'brackets'>): boolean {
  return plan.brackets.length > 0;
}

/**
 * Exactly the planned count: the server only offers to keep the configuration, so a summary to
 * confirm is enough. An impossible plan still goes through the options, which say so.
 */
export function isSummaryLaunch(plan: Pick<TournamentPlan, 'brackets' | 'options'>): boolean {
  return isPlanPossible(plan) && plan.options.every((option) => option.id === 'keep');
}

/** A bracket filled below the red threshold: the admin has to confirm. */
export function hasLowFill(plan: Pick<TournamentPlan, 'warnings'>): boolean {
  return plan.warnings.some((warning) => warning.code === 'LOW_FILL');
}

/** The worst fill level among the brackets of a plan. */
export function worstFillLevel(plan: Pick<TournamentPlan, 'brackets'>): FillLevel {
  const levels = plan.brackets.map((bracket) => bracket.fillLevel);
  if (levels.includes('low')) return 'low';
  return levels.includes('mid') ? 'mid' : 'ok';
}
