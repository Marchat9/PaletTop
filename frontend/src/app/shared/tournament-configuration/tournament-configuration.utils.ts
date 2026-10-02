import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompetitionMode } from 'src/app/models/tournament-configuration-detail.model';
import { FIELD_LABELS } from './tournament-configuration';
import { TournamentConfigurationForm } from './tournament-configuration-form.model';

// Each competition mode has its own `modeParameter.xxxMode` sub-group; only the one matching
// the currently selected mode should ever contribute to validation — the other two stay
// invisible even if left blank, since they're not the mode the user is actually configuring.
const MODE_PARAMETER_GROUP_BY_COMPETITION_MODE: Record<CompetitionMode, string> = {
  standard: 'structuredMode',
  up_down: 'upDownMode',
  championship: 'championshipMode',
};

// Applies the side effects specific to the selected competition mode: only championship
// requires homeTeam/awayTeam, and it caps maxTeamCapacity at a single home/away match instead
// of the usual default. Called once at form construction (for the tournament's initial mode)
// and again from an effect on every subsequent competitionMode change, so both paths stay in
// sync from this single place.
export function applyCompetitionModeSideEffects(
  form: TournamentConfigurationForm,
  mode: CompetitionMode,
  teamCapacity: { max: number; maxChampionship: number },
): void {
  const championshipControls = form.controls.modeParameter.controls.championshipMode.controls;
  const championshipValidators = mode === 'championship' ? [Validators.required] : [];
  championshipControls.homeTeam.setValidators(championshipValidators);
  championshipControls.homeTeam.updateValueAndValidity();
  championshipControls.awayTeam.setValidators(championshipValidators);
  championshipControls.awayTeam.updateValueAndValidity();

  form.controls.rules.controls.maxTeamCapacity.setValue(
    mode === 'championship' ? teamCapacity.maxChampionship : teamCapacity.max,
  );
}

// The ranking-based last round needs at least one drawn round before it, so at least 2 rounds.
export function isLastRoundByRankingAllowed(numberOfRound: number | undefined | null): boolean {
  return !!numberOfRound && numberOfRound >= 2;
}

// Unchecks the ranking-based last round when the number of rounds no longer allows it, so a
// hidden checkbox never sends `true`.
export function resetLastRoundByRankingIfNotAllowed(form: TournamentConfigurationForm): void {
  const upDownControls = form.controls.modeParameter.controls.upDownMode.controls;
  if (
    upDownControls.lastRoundByRanking.value &&
    !isLastRoundByRankingAllowed(upDownControls.numberOfRound.value)
  ) {
    upDownControls.lastRoundByRanking.setValue(false);
  }
}

export function getInvalidFieldNames(form: FormGroup): string[] {
  const competitionMode = form.get('modeParameter.competitionMode')?.value as
    CompetitionMode | undefined;
  const activeModeGroup = competitionMode
    ? MODE_PARAMETER_GROUP_BY_COMPETITION_MODE[competitionMode]
    : undefined;

  const skippedPaths = new Set(
    Object.values(MODE_PARAMETER_GROUP_BY_COMPETITION_MODE)
      .filter((groupName) => groupName !== activeModeGroup)
      .map((groupName) => `modeParameter.${groupName}`),
  );

  return recursiveFormGroupFindError(form, '', skippedPaths);
}

function recursiveFormGroupFindError(
  group: FormGroup,
  prefix: string,
  skippedPaths: ReadonlySet<string>,
): string[] {
  const result: string[] = [];
  for (const [key, ctrl] of Object.entries(group.controls)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (skippedPaths.has(path)) {
      continue;
    }

    if (ctrl instanceof FormGroup && ctrl.invalid) {
      result.push(...recursiveFormGroupFindError(ctrl, path, skippedPaths));
    } else if (ctrl instanceof FormControl && ctrl.invalid) {
      result.push(FIELD_LABELS[path] ?? path);
    }
  }
  return result;
}
