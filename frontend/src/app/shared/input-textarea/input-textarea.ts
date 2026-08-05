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

@Component({
  selector: 'app-input-textarea',
  imports: [],
  templateUrl: './input-textarea.html',
  styleUrl: './input-textarea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputTextarea),
      multi: true,
    },
  ],
})
export class InputTextarea implements ControlValueAccessor {
  readonly id = input<string>('');
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input<number>(3);
  readonly disabled = input<boolean>(false);

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

  onInput(value: string): void {
    this.internalValue.set(value);
    this.valueChange.emit(value);
    this.onChangeFn(value);
    this.onTouchedFn();
  }
}
