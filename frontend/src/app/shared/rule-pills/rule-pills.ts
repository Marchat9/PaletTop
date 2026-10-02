import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

export interface RulePill {
  icon: string;
  label: string;
}

/** A wrapping row of small pills summing up active settings. */
@Component({
  selector: 'app-rule-pills',
  standalone: true,
  imports: [Icon],
  templateUrl: './rule-pills.html',
  styleUrl: './rule-pills.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulePills {
  public readonly rules = input<RulePill[]>([]);
}
