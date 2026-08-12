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
  selector: 'app-switch',
  imports: [],
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Switch),
      multi: true,
    },
  ],
})
export class Switch implements ControlValueAccessor {
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('');

  readonly checkedChange = output<boolean>();

  protected readonly internalValue = signal(false);
  private isControlValueAccessorActive = false;
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.checked());
      }
    });
  }

  writeValue(value: boolean): void {
    this.internalValue.set(value ?? false);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onChange(checked: boolean): void {
    this.internalValue.set(checked);
    this.checkedChange.emit(checked);
    this.onChangeFn(checked);
    this.onTouchedFn();
  }
}
