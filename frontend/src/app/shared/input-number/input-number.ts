import {
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Nullable } from '../../models/nullable.model';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-input-number',
  imports: [Icon],
  templateUrl: './input-number.html',
  styleUrl: './input-number.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputNumber),
      multi: true,
    },
  ],
})
export class InputNumber implements ControlValueAccessor {
  readonly id = input<string>('');
  readonly value = input<Nullable<number>>(null);
  readonly placeholder = input<Nullable<string>>(null);
  readonly placeholderAsValue = input<boolean>(false);
  readonly min = input<Nullable<number>>(null);
  readonly max = input<Nullable<number>>(null);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);
  readonly zeroAsUndefined = input<boolean>(false);

  readonly valueChange = output<number>();

  protected readonly internalValue = signal<Nullable<number>>(null);
  private isControlValueAccessorActive = false;
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.value());
      }
    });
  }

  writeValue(value: number | undefined): void {
    this.internalValue.set(value ?? null);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  private emitValue(value: number): void {
    const cvaValue = this.zeroAsUndefined() && value === 0 ? undefined : value;
    this.internalValue.set(cvaValue ?? null);
    this.valueChange.emit(value);
    this.onChangeFn(cvaValue);
    this.onTouchedFn();
  }

  onInput(value: string): void {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    this.emitValue(nextValue);
  }

  onIncrement(): void {
    if (this.disabled()) {
      return;
    }

    const nextValue = this.getCurrentValue() + this.step();
    const max = this.max();
    this.emitValue(max != null ? Math.min(nextValue, max) : nextValue);
  }

  onDecrement(): void {
    if (this.disabled()) {
      return;
    }

    const nextValue = this.getCurrentValue() - this.step();
    const min = this.min();
    this.emitValue(min != null ? Math.max(nextValue, min) : nextValue);
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
    const currentValue = this.internalValue();
    if (currentValue == null || Number.isNaN(currentValue)) {
      return 0;
    }

    return currentValue;
  }
}
