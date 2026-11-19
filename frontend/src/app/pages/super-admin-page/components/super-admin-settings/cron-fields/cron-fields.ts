import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { explainCron, hasCronFieldCount } from './cron-fields.util';

/** Under a cron input: what each position of the expression means. */
@Component({
  selector: 'app-cron-fields',
  templateUrl: './cron-fields.html',
  styleUrl: './cron-fields.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronFieldsComponent {
  public readonly expression = input.required<string>();

  public readonly fields = computed(() => explainCron(this.expression()));
  public readonly isWellFormed = computed(() => hasCronFieldCount(this.expression()));
}
