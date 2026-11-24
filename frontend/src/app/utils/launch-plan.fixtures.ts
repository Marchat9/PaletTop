import {
  FillLevel,
  PlanBracket,
  PlanOption,
  PlanOptionId,
  PlanWarning,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';

/** Plans of the launch check, shared by the specs that need one (not used by the application). */

export function planBracket(
  key: string,
  label: string,
  capacity: number,
  teamCount: number,
  fillLevel: FillLevel = 'ok',
): PlanBracket {
  return {
    key,
    label,
    capacity,
    teamCount,
    fillRatio: teamCount / capacity,
    fillLevel,
    extra: false,
    bestLosersFirstRound: 0,
  };
}

export function launchPlanOf(
  teamCount: number,
  brackets: PlanBracket[],
  warnings: PlanWarning[] = [],
  eliminatedAfterQualifying = 0,
): Omit<TournamentPlan, 'options'> {
  return {
    teamCount,
    eliminatedAfterQualifying,
    brackets,
    rounds: [],
    totalRounds: 9,
    maxPlates: 64,
    warnings,
    comfort: null,
  };
}

export const LOW_FILL_WARNING: PlanWarning = {
  code: 'LOW_FILL',
  level: 'warning',
  message: 'Consolante B : 21 équipes sur 32.',
  bracketKey: 'consolante_2',
};

export function planOption(
  id: PlanOptionId,
  label: string,
  plan: Omit<TournamentPlan, 'options'>,
  overrides: Partial<PlanOption> = {},
): PlanOption {
  return {
    id,
    label,
    description: `Description de ${label}`,
    recommended: false,
    consolationCount: plan.brackets.length - 1,
    eliminatedAfterQualifying: plan.eliminatedAfterQualifying,
    plan,
    ...overrides,
  };
}

/** 117 teams for 128 planned: keep (a bracket far from full), recalculate, stop the last five. */
export function fewerTeamsPlan(): TournamentPlan {
  const keep = launchPlanOf(
    117,
    [
      planBracket('principale', 'Principale', 64, 64),
      planBracket('consolante_1', 'Consolante A', 32, 32),
      planBracket('consolante_2', 'Consolante B', 32, 21, 'low'),
    ],
    [LOW_FILL_WARNING],
  );
  const recalculate = launchPlanOf(117, [
    planBracket('principale', 'Principale', 64, 64),
    planBracket('consolante_1', 'Consolante A', 64, 53, 'ok'),
  ]);
  const stopLast = launchPlanOf(
    112,
    [
      planBracket('principale', 'Principale', 64, 64),
      planBracket('consolante_1', 'Consolante A', 32, 32),
      planBracket('consolante_2', 'Consolante B', 16, 16),
    ],
    [],
    5,
  );
  return {
    ...keep,
    options: [
      planOption('keep', 'Garder ma configuration', keep, { consolationCount: 2 }),
      planOption('recalculate', 'Passer à 2 tableaux', recalculate, { consolationCount: 1 }),
      planOption('stop_last', 'Arrêter les 5 derniers après les qualifs', stopLast, {
        consolationCount: 2,
      }),
    ],
  };
}

/** The planned count: the server only offers to keep the configuration, nothing to pick. */
export function exactCountPlan(bracketCount = 3): TournamentPlan {
  const brackets = [planBracket('principale', 'Principale', 64, 64)];
  for (let index = 1; index < bracketCount; index++) {
    brackets.push(planBracket(`consolante_${index}`, `Consolante ${index}`, 32, 32));
  }
  const keep = { ...launchPlanOf(128, brackets), totalRounds: 9, maxPlates: 64 };
  return {
    ...keep,
    options: [
      planOption('keep', 'Garder la configuration', keep, {
        consolationCount: bracketCount - 1,
        recommended: true,
      }),
    ],
  };
}

export const IMPOSSIBLE_WARNING: PlanWarning = {
  code: 'IMPOSSIBLE',
  level: 'error',
  message: 'Pas assez d’équipes pour 3 tableaux.',
  validConsolationCounts: [0],
};

/** 3 teams for 3 brackets: no bracket can be drawn, the only option keeps an impossible plan. */
export function impossiblePlan(): TournamentPlan {
  const keep = launchPlanOf(3, [], [IMPOSSIBLE_WARNING]);
  return {
    ...keep,
    options: [planOption('keep', 'Garder la configuration', keep, { consolationCount: 2 })],
  };
}
