import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-input-text',
  imports: [Icon],
  templateUrl: './input-text.html',
  styleUrl: './input-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputText),
      multi: true,
    },
  ],
})
export class InputText implements AfterViewInit, ControlValueAccessor {
  readonly id = input<string>('');
  readonly placeholder = input<string>('');
  readonly autocomplete = input<string>('off');
  readonly value = input<string>('');
  readonly autofocus = input<boolean>(false);
  readonly uppercase = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly icon = input<string>('');
  readonly isPassword = input<boolean>(false);

  readonly valueChange = output<string>();

  protected readonly internalValue = signal('');
  private isControlValueAccessorActive = false;
  private onChangeFn: (v: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('inputElement');

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.value());
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.autofocus() || this.disabled()) {
      return;
    }

    queueMicrotask(() => {
      const input = this.inputElement()?.nativeElement;
      input?.focus();
      input?.select();
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
    const nextValue = this.uppercase() ? value.toUpperCase() : value;
    this.internalValue.set(nextValue);
    this.valueChange.emit(nextValue);
    this.onChangeFn(nextValue);
    this.onTouchedFn();
  }
}
