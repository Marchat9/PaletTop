import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-number-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-number-input.html',
  styleUrl: './code-number-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'code-number-input',
  },
})
export class CodeNumberInputComponent implements OnInit {
  public readonly digitCount = input(4);
  // Prefills the digits once: the parent already knows this value, so nothing is emitted.
  public readonly initialCode = input('');
  public readonly codeChange = output<string>();
  /** The last digit has just been typed: the parent can move on to the next field. */
  public readonly completed = output<void>();
  /** Digits pasted beyond this group (e.g. both codes at once), for the next group. */
  public readonly overflow = output<string>();

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly codeDigits = signal<string[]>([]);

  public readonly digits = computed(() =>
    Array.from({ length: this.digitCount() }, (_, i) => this.codeDigits()[i] ?? ''),
  );

  public readonly isComplete = computed(() => this.digits().every((digit) => digit !== ''));

  public readonly fullCode = computed(() => this.digits().join(''));

  ngOnInit(): void {
    const digits = this.initialCode()
      .replace(/[^0-9]/g, '')
      .slice(0, this.digitCount());
    if (digits) {
      this.codeDigits.set(digits.split(''));
    }
  }

  public onDigitInput(value: string, index: number): void {
    const numericValue = value.replace(/[^0-9]/g, '').slice(-1);

    this.codeDigits.update((digits) => {
      const updated = [...digits];
      updated[index] = numericValue;
      return updated;
    });

    if (numericValue && index < this.digitCount() - 1) {
      this.focusInput(index + 1);
    }

    this.codeChange.emit(this.fullCode());
    if (numericValue && index === this.digitCount() - 1 && this.isComplete()) {
      this.completed.emit();
    }
  }

  public onDigitKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.codeDigits()[index] && index > 0) {
      this.focusInput(index - 1);
    }
  }

  public onDigitPaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') ?? '';
    const digits = pastedText.replace(/[^0-9]/g, '').split('');

    if (digits.length === 0) {
      return;
    }

    this.codeDigits.update((currentDigits) => {
      const updated = [...currentDigits];

      for (let i = 0; i < digits.length && index + i < this.digitCount(); i++) {
        updated[index + i] = digits[i];
      }

      return updated;
    });

    this.codeChange.emit(this.fullCode());

    const extra = digits.slice(this.digitCount() - index).join('');
    if (extra) {
      this.overflow.emit(extra);
      return;
    }

    // Focus the next empty field or the last field
    const nextEmptyIndex = this.codeDigits().findIndex((digit, idx) => !digit && idx > index);
    const nextFocusIndex =
      nextEmptyIndex !== -1
        ? nextEmptyIndex
        : Math.min(index + digits.length, this.digitCount() - 1);
    this.focusInput(nextFocusIndex);
  }

  /** Fills the group from the start (digits handed over by the previous group). */
  public fill(code: string): void {
    const digits = code
      .replace(/[^0-9]/g, '')
      .slice(0, this.digitCount())
      .split('');
    this.codeDigits.set(digits);
    this.codeChange.emit(this.fullCode());
    this.focusInput(Math.min(digits.length, this.digitCount() - 1));
  }

  public focus(): void {
    this.focusInput(0);
  }

  public reset(): void {
    this.codeDigits.set(Array(this.digitCount()).fill(''));
    this.codeChange.emit('');
  }

  public getCode(): string {
    return this.fullCode();
  }

  private focusInput(index: number): void {
    queueMicrotask(() => {
      const input = this.hostElement.nativeElement.querySelector(
        `input[data-digit-index="${index}"]`,
      ) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }
}
