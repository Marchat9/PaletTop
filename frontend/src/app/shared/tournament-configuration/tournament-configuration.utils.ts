import { FormControl, FormGroup } from '@angular/forms';
import { FIELD_LABELS } from './tournament-configuration';

export function getInvalidFieldNames(form: FormGroup): string[] {
  return recursiveFormGroupFindError(form, '');
}

function recursiveFormGroupFindError(group: FormGroup, prefix: string): string[] {
  const result: string[] = [];
  for (const [key, ctrl] of Object.entries(group.controls)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (ctrl instanceof FormGroup && ctrl.invalid) {
      result.push(...recursiveFormGroupFindError(ctrl, path));
    } else if (ctrl instanceof FormControl && ctrl.invalid) {
      result.push(FIELD_LABELS[path] ?? path);
    }
  }
  return result;
}
