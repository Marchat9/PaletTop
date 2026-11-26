import { PlanWarning, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { ALL_BRACKETS_FILLED_MESSAGE, pickPlanMessage } from './plan-message.util';

function planWith(...warnings: PlanWarning[]): TournamentPlan {
  return {
    teamCount: 100,
    eliminatedAfterQualifying: 0,
    brackets: [],
    rounds: [],
    totalRounds: 0,
    maxPlates: 0,
    warnings,
    comfort: null,
    options: [],
  };
}

const error: PlanWarning = { code: 'IMPOSSIBLE', level: 'error', message: 'Impossible.' };
const extra: PlanWarning = { code: 'EXTRA_BRACKET', level: 'info', message: 'Consolante en plus.' };
const mid: PlanWarning = { code: 'MID_FILL', level: 'info', message: 'Quelques exemptés.' };
const low: PlanWarning = { code: 'LOW_FILL', level: 'warning', message: 'Peu rempli.' };
const noThirdPlace: PlanWarning = {
  code: 'NO_THIRD_PLACE',
  level: 'warning',
  message: 'Pas de 3e place.',
};

describe('pickPlanMessage', () => {
  it('shows nothing without a plan', () => {
    expect(pickPlanMessage(null)).toBeNull();
  });

  it('says everything is fine when the plan has no warning', () => {
    expect(pickPlanMessage(planWith())).toEqual({
      tone: 'info',
      icon: 'check_circle',
      text: ALL_BRACKETS_FILLED_MESSAGE,
    });
  });

  it('puts the error before everything else', () => {
    expect(pickPlanMessage(planWith(mid, extra, low, error))?.text).toBe('Impossible.');
    expect(pickPlanMessage(planWith(error))?.tone).toBe('alert');
  });

  it('puts the extra bracket before the fill messages', () => {
    const message = pickPlanMessage(planWith(mid, low, extra));
    expect(message?.text).toBe('Consolante en plus.');
    expect(message?.tone).toBe('info');
  });

  it('shows the fill message, the red one before the orange one', () => {
    expect(pickPlanMessage(planWith(mid))?.text).toBe('Quelques exemptés.');
    const red = pickPlanMessage(planWith(mid, low));
    expect(red?.text).toBe('Peu rempli.');
    expect(red?.tone).toBe('alert');
  });

  it('shows the other warnings after the fill ones', () => {
    expect(pickPlanMessage(planWith(noThirdPlace, mid))?.text).toBe('Quelques exemptés.');
    expect(pickPlanMessage(planWith(noThirdPlace))?.text).toBe('Pas de 3e place.');
  });
});
