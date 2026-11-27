import {
  CompetitionMode,
  SpecificTournamentConfig,
  StructuredTournamentConfig,
  TournamentConfigurationDetailsDto,
} from '../models/tournament-configuration-detail.model';
import { TournamentConfigurationDto } from '../models/tournament-configuration.model';
import { TournamentConfigurationForm } from '../shared/tournament-configuration/tournament-configuration-form.model';
import { combineLatest, distinctUntilChanged, filter, map, Observable, startWith } from 'rxjs';
import { Nullable } from '../models/nullable.model';
import { PlanPreviewBody } from '../models/tournament-plan.model';
import { TournamentModeParameterForm } from '../shared/tournament-configuration/tournament-mode-parameter/tournament-mode-parameter-form.model';

export function convertTournamentFormToTournamentConfigurationDto(
  tournamentForm: TournamentConfigurationForm,
): TournamentConfigurationDto {
  return {
    name: tournamentForm.controls.parameters.controls.name.value,
    code: tournamentForm.controls.parameters.controls.code.value,
    adminPassword: tournamentForm.controls.parameters.controls.adminPassword.value,
    date: tournamentForm.controls.parameters.controls.date.value,
    description: tournamentForm.controls.parameters.controls.description.value ?? '',

    configuration: convertToTournamentConfigurationDetailsDto(tournamentForm),
  };
}

export function convertToTournamentConfigurationDetailsDto(
  tournamentForm: TournamentConfigurationForm,
): TournamentConfigurationDetailsDto {
  const rulesControls = tournamentForm.controls.rules.controls;
  const modeParameterControls = tournamentForm.controls.modeParameter.controls;

  return {
    maxTeamCapacity: rulesControls.maxTeamCapacity.value,
    scoreCalculation: modeParameterControls.scoreCalculation.value,
    pointsPerGame: rulesControls.pointsPerGame.value,
    rematch: rulesControls.rematch.value,
    matchAgainstFullSameClub: rulesControls.matchAgainstFullSameClub.value,
    matchAgainstPartialSameClub: rulesControls.matchAgainstPartialSameClub.value,
    competitionMode: modeParameterControls.competitionMode.value,

    competitionConfiguration: extractCompetitionConfiguration(
      tournamentForm.controls.modeParameter,
    ),
  };
}

export function extractCompetitionConfiguration(
  tournamentModeParameter: TournamentModeParameterForm,
): SpecificTournamentConfig {
  const mode: CompetitionMode = tournamentModeParameter.controls.competitionMode.value;

  switch (mode) {
    case 'standard':
      const structuredConfigControls = tournamentModeParameter.controls.structuredMode.controls;
      return {
        numberOfQualifyingRounds: structuredConfigControls.numberOfQualifyingRounds.value,
        consolationCount: structuredConfigControls.consolationCount.value,
        hasChallenges: structuredConfigControls.hasChallenges.value,
        hasThirdPlaceMatch: structuredConfigControls.hasThirdPlaceMatch.value,
        eliminationSeeding: structuredConfigControls.eliminationSeeding.value,
      };
    case 'up_down':
      const upDownConfigControls = tournamentModeParameter.controls.upDownMode.controls;
      return {
        numberOfRound: upDownConfigControls.numberOfRound.value,
        lastRoundByRanking: upDownConfigControls.lastRoundByRanking.value,
        pairingMode: upDownConfigControls.pairingMode.value,
      };
    case 'championship':
      const championshipConfigControls = tournamentModeParameter.controls.championshipMode.controls;
      return {
        homeClub: championshipConfigControls.homeTeam.value,
        awayClub: championshipConfigControls.awayTeam.value,
      };
    default:
      return {};
  }
}

/**
 * Request of the live preview for the structured mode: the registered teams when there are enough
 * of them (draft edit), the target count otherwise. Null for another mode or an incomplete form.
 */
export function buildPlanPreviewBody(
  tournamentForm: TournamentConfigurationForm,
  registeredCount: Nullable<number>,
): PlanPreviewBody | null {
  const modeParameter = tournamentForm.controls.modeParameter;
  const targetControl = tournamentForm.controls.rules.controls.maxTeamCapacity;
  if (
    modeParameter.controls.competitionMode.value !== 'standard' ||
    modeParameter.controls.structuredMode.invalid ||
    targetControl.invalid
  ) {
    return null;
  }

  // The plan does not depend on how the first round of a bracket is placed: changing it must not
  // ask for a new preview.
  const planConfiguration: StructuredTournamentConfig = {
    ...(extractCompetitionConfiguration(modeParameter) as StructuredTournamentConfig),
  };
  delete planConfiguration.eliminationSeeding;

  const targetCount = targetControl.value;
  return {
    competitionMode: 'standard',
    competitionConfiguration: planConfiguration,
    teamCount: registeredCount && registeredCount >= 2 ? registeredCount : targetCount,
    targetCount,
  };
}

/**
 * Whether a simulation body asks what the live preview already asks (same team count): its plan is
 * then the preview's, a second request would only repeat the first.
 */
export function repeatsPreview(
  tournamentForm: TournamentConfigurationForm,
  registeredCount: Nullable<number>,
  simulationBody: PlanPreviewBody,
): boolean {
  return (
    buildPlanPreviewBody(tournamentForm, registeredCount)?.teamCount === simulationBody.teamCount
  );
}

/** Debounce of the live preview, applied by the pages. */
export const PLAN_PREVIEW_DEBOUNCE_MS = 300;

/**
 * Requests of the live preview: one per change of what the plan depends on (the form or the
 * registered teams), none while the form cannot be previewed.
 */
export function planPreviewBodies(
  tournamentForm: TournamentConfigurationForm,
  registeredCount: Observable<Nullable<number>>,
): Observable<PlanPreviewBody> {
  return combineLatest([tournamentForm.valueChanges.pipe(startWith(null)), registeredCount]).pipe(
    map(([, registered]) => buildPlanPreviewBody(tournamentForm, registered)),
    filter((body): body is PlanPreviewBody => body !== null),
    distinctUntilChanged((previous, next) => JSON.stringify(previous) === JSON.stringify(next)),
  );
}
