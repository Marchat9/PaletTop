import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
  inject,
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
export class CodeNumberInputComponent {
  public readonly digitCount = input(4);
  public readonly codeChange = output<string>();

  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private readonly codeDigits = signal<string[]>([]);

  public readonly digits = computed(() =>
    Array.from({ length: this.digitCount() }, (_, i) => this.codeDigits()[i] ?? ''),
  );

  public readonly isComplete = computed(() => this.digits().every((digit) => digit !== ''));

  public readonly fullCode = computed(() => this.digits().join(''));

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

    // Focus the next empty field or the last field
    const nextEmptyIndex = this.codeDigits().findIndex((digit, idx) => !digit && idx > index);
    const nextFocusIndex =
      nextEmptyIndex !== -1
        ? nextEmptyIndex
        : Math.min(index + digits.length, this.digitCount() - 1);
    this.focusInput(nextFocusIndex);
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
