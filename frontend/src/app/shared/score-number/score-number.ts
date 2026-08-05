import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Nullable } from '../../models/nullable.model';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-score-number',
  imports: [Icon],
  templateUrl: './score-number.html',
  styleUrl: './score-number.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreNumber {
  public readonly id = input<string>('');
  public readonly colorRed = input.required<boolean>();
  public readonly value = input<Nullable<number>>(null);
  public readonly min = input<Nullable<number>>(null);
  public readonly max = input<Nullable<number>>(null);
  public readonly step = input<number>(1);
  public readonly disabled = input<boolean>(false);

  public readonly valueChange = output<number>();

  onInput(value: string): void {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    this.valueChange.emit(nextValue);
  }

  onIncrement(): void {
    if (this.disabled()) {
      return;
    }

    const nextValue = this.getCurrentValue() + this.step();
    const max = this.max();
    this.valueChange.emit(max != null ? Math.min(nextValue, max) : nextValue);
  }

  onDecrement(): void {
    if (this.disabled()) {
      return;
    }

    const nextValue = this.getCurrentValue() - this.step();
    const min = this.min();
    this.valueChange.emit(min != null ? Math.max(nextValue, min) : nextValue);
  }

  canIncrement(): boolean {
    const max = this.max();
    return !this.disabled() && (max == null || this.getCurrentValue() < max);
  }

  canDecrement(): boolean {
    const min = this.min();
    return !this.disabled() && (min == null || this.getCurrentValue() > min);
  }

  private getCurrentValue(): number {
    const currentValue = this.value();
    if (currentValue == null || Number.isNaN(currentValue)) {
      return 0;
    }

    return currentValue;
  }
}
