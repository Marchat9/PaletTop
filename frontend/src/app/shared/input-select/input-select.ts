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

export interface InputSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-input-select',
  imports: [],
  templateUrl: './input-select.html',
  styleUrl: './input-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputSelect),
      multi: true,
    },
  ],
})
export class InputSelect implements ControlValueAccessor {
  readonly id = input<string>('');
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly options = input<readonly InputSelectOption[]>([]);

  readonly valueChange = output<string>();

  protected readonly internalValue = signal('');
  private isControlValueAccessorActive = false;
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.value() ?? '');
      }
    });
  }

  writeValue(value: string): void {
    this.internalValue.set(value ?? '');
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onChange(value: string): void {
    this.internalValue.set(value);
    this.valueChange.emit(value);
    this.onChangeFn(value);
    this.onTouchedFn();
  }
}
