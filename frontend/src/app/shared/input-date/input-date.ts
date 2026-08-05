import {
  Component,
  ChangeDetectionStrategy,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-input-date',
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    Icon,
  ],
  templateUrl: './input-date.html',
  styleUrl: './input-date.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputDate),
      multi: true,
    },
  ],
})
export class InputDate implements ControlValueAccessor {
  readonly value = input<Date>();
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);

  readonly valueChange = output<Date>();

  protected readonly internalValue = signal<Date | undefined>(undefined);
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

  writeValue(value: Date): void {
    this.internalValue.set(value);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onDateChange(event: any): void {
    const date = event.value;
    if (date) {
      date.setHours(-(date.getTimezoneOffset() / 60));
      this.internalValue.set(date);
      this.valueChange.emit(date);
      this.onChangeFn(date);
      this.onTouchedFn();
    }
  }
}
