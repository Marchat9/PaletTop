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

  // A typed value is bounded like a stepped one. `min`/`max` on a native number input are only
  // advisory - the browser lets anything through - so without this a "99" typed in a field capped at
  // 6 would travel all the way to the API and come back as a 400.
  onInput(value: string): void {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    // An empty field is not a value yet: left as it is, so it can be retyped without the bounds
    // jumping in.
    this.emitValue(value === '' ? nextValue : this.clamp(nextValue));
  }

  onIncrement(): void {
    if (this.disabled()) {
      return;
    }
    this.emitValue(this.clamp(this.getCurrentValue() + this.step()));
  }

  onDecrement(): void {
    if (this.disabled()) {
      return;
    }
    this.emitValue(this.clamp(this.getCurrentValue() - this.step()));
  }

  private clamp(value: number): number {
    const min = this.min();
    const max = this.max();

    if (max != null && value > max) {
      return max;
    }
    if (min != null && value < min) {
      return min;
    }
    return value;
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
