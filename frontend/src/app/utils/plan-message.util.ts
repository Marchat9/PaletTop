import { PlanWarning, TournamentPlan } from 'src/app/models/tournament-plan.model';

export type PlanMessageTone = 'info' | 'alert';

/** The single message shown under the brackets of the plan. */
export interface PlanMessage {
  tone: PlanMessageTone;
  icon: string;
  text: string;
}

export const ALL_BRACKETS_FILLED_MESSAGE = 'Tous les tableaux sont bien remplis.';

/**
 * One message for the whole plan, so that the panel does not jump:
 * error > extra bracket > fill (red before orange) > any other warning > everything is fine.
 * The text of a warning is the French message of the backend.
 */
export function pickPlanMessage(plan: TournamentPlan | null): PlanMessage | null {
  if (!plan) {
    return null;
  }

  const warnings = plan.warnings;
  const error = warnings.find((warning) => warning.level === 'error');
  if (error) {
    return { tone: 'alert', icon: 'error', text: error.message };
  }

  const extra = warnings.find((warning) => warning.code === 'EXTRA_BRACKET');
  if (extra) {
    return fromWarning(extra);
  }

  const fill =
    warnings.find((warning) => warning.code === 'LOW_FILL') ??
    warnings.find((warning) => warning.code === 'MID_FILL');
  if (fill) {
    return fromWarning(fill);
  }

  if (warnings.length) {
    return fromWarning(warnings[0]);
  }

  return { tone: 'info', icon: 'check_circle', text: ALL_BRACKETS_FILLED_MESSAGE };
}

function fromWarning(warning: PlanWarning): PlanMessage {
  return warning.level === 'info'
    ? { tone: 'info', icon: 'info', text: warning.message }
    : { tone: 'alert', icon: 'warning', text: warning.message };
}
