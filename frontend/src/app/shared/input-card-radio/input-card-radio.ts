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
import { Icon } from '../icon/icon';

export interface InputCardRadioOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
}

@Component({
  selector: 'app-input-card-radio',
  imports: [Icon],
  templateUrl: './input-card-radio.html',
  styleUrl: './input-card-radio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputCardRadio),
      multi: true,
    },
  ],
})
export class InputCardRadio<T> implements ControlValueAccessor {
  readonly options = input<readonly InputCardRadioOption<T>[]>([]);
  readonly value = input<T>();
  readonly columns = input<number>(2);

  readonly valueChange = output<T>();

  protected readonly internalValue = signal<T | undefined>(undefined);
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

  writeValue(value: T): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onSelect(value: T): void {
    this.internalValue.set(value);
    this.valueChange.emit(value);
    this.onChangeFn(value);
    this.onTouchedFn();
  }
}
