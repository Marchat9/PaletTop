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
import { Nullable } from '../../models/nullable.model';
import { Icon } from '../icon/icon';

/** Values of the inputmode attribute: which virtual keyboard a mobile browser shows. */
export type InputMode =
  'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none';
/** Values of the aria-autocomplete attribute. */
export type AriaAutocomplete = 'none' | 'inline' | 'list' | 'both';
export type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';

@Component({
  selector: 'app-input-text',
  imports: [Icon],
  templateUrl: './input-text.html',
  styleUrl: './input-text.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The id is forwarded to the inner field: left on the host too, it would be duplicated in the
  // page and a <label for> would point at the wrapper instead of the field.
  host: { '[attr.id]': 'null' },
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
  readonly maxLength = input<number>(100);
  /** Mobile keyboard to show, e.g. 'numeric' for a code made of digits. */
  readonly inputmode = input<InputMode | null>(null);
  readonly enterKeyHint = input<EnterKeyHint | null>(null);
  readonly disabled = input<boolean>(false);
  readonly icon = input<string>('');
  readonly isPassword = input<boolean>(false);
  /** Error state: red styling and aria-invalid. */
  readonly invalid = input<boolean>(false);
  readonly describedBy = input<Nullable<string>>(null);
  readonly role = input<Nullable<string>>(null);
  readonly ariaExpanded = input<Nullable<boolean>>(null);
  readonly ariaControls = input<Nullable<string>>(null);
  readonly ariaActivedescendant = input<Nullable<string>>(null);
  readonly ariaAutocomplete = input<Nullable<AriaAutocomplete>>(null);

  readonly valueChange = output<string>();
  readonly focused = output<void>();
  readonly blurred = output<void>();
  readonly keyPressed = output<KeyboardEvent>();

  protected readonly internalValue = signal('');
  protected readonly showPassword = signal(false);
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

  toggleShowPassword(): void {
    this.showPassword.update((shown) => !shown);
  }
}
