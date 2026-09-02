import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionMode } from 'src/app/models/tournament-configuration-detail.model';
import { FIELD_LABELS } from './tournament-configuration';

// Each competition mode has its own `modeParameter.xxxMode` sub-group; only the one matching
// the currently selected mode should ever contribute to validation — the other two stay
// invisible even if left blank, since they're not the mode the user is actually configuring.
const MODE_PARAMETER_GROUP_BY_COMPETITION_MODE: Record<CompetitionMode, string> = {
  standard: 'structuredMode',
  up_down: 'upDownMode',
  championship: 'championshipMode',
};

export function getInvalidFieldNames(form: FormGroup): string[] {
  const competitionMode = form.get('modeParameter.competitionMode')?.value as
    | CompetitionMode
    | undefined;
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
