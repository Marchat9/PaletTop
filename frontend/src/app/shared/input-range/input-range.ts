import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Nullable } from '../../models/nullable.model';

@Component({
  selector: 'app-input-range',
  imports: [],
  templateUrl: './input-range.html',
  styleUrl: './input-range.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputRange),
      multi: true,
    },
  ],
})
export class InputRange implements ControlValueAccessor {
  readonly min = input<Nullable<number>>(null);
  readonly max = input<Nullable<number>>(null);
  readonly step = input<Nullable<number>>(null);
  readonly value = input<Nullable<number>>(null);
  readonly minPostLabel = input<string>('Min');
  readonly maxPostLabel = input<string>('Max');

  readonly valueChange = output<number>();

  protected readonly internalValue = signal<number>(0);
  private isControlValueAccessorActive = false;
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  readonly minLabel = computed(() =>
    `${this.min() !== null ? this.min() : ''} ${this.minPostLabel()}`.trim(),
  );
  readonly maxLabel = computed(() =>
    `${this.max() !== null ? this.max() : ''} ${this.maxPostLabel()}`.trim(),
  );

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.value() ?? 0);
      }
    });
  }

  writeValue(value: number): void {
    this.internalValue.set(value ?? 0);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onInput(value: string): void {
    const nextValue = Number(value);
    this.internalValue.set(nextValue);
    this.valueChange.emit(nextValue);
    this.onChangeFn(nextValue);
    this.onTouchedFn();
  }
}
