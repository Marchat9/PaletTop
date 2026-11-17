import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';
import { InputNumber } from 'src/app/shared/input-number/input-number';

export type ScoreStepperSize = 'compact' | 'large';

/** « − score + » for one team: compact inside a desktop row, large in the mobile sheet. */
@Component({
  selector: 'app-score-stepper',
  imports: [Icon, InputNumber],
  templateUrl: './score-stepper.html',
  styleUrl: './score-stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.large]': "size() === 'large'" },
})
export class ScoreStepper {
  // ======= Input / Output =======
  public readonly value = input.required<number>();
  public readonly max = input.required<number>();
  /** Team name, read by screen readers on the − and + buttons. */
  public readonly teamName = input<string>('');
  public readonly size = input<ScoreStepperSize>('compact');

  public readonly valueChange = output<number>();
  // ==============================

  public readonly canDecrement = computed(() => this.value() > 0);
  public readonly canIncrement = computed(() => this.value() < this.max());
  public readonly decrementLabel = computed(() => `Retirer un point à ${this.teamName()}`);
  public readonly incrementLabel = computed(() => `Ajouter un point à ${this.teamName()}`);

  public step(delta: number): void {
    this.set(this.value() + delta);
  }

  public set(value: number): void {
    const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), this.max());
    this.valueChange.emit(clamped);
  }
}
