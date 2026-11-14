import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  DestroyRef,
} from '@angular/core';
import { Nullable } from '../../models/nullable.model';
import { InputText } from '../input-text/input-text';
import { nextActiveIndex } from './input-autocomplete.utils';

interface AutocompleteItem {
  label: string;
  id: string;
}

/**
 * Text input with a keyboard-accessible suggestion list (ARIA combobox, list autocomplete).
 * The parent supplies `options` in response to `search`; free text is always allowed.
 */
@Component({
  selector: 'app-input-autocomplete',
  imports: [InputText],
  templateUrl: './input-autocomplete.html',
  styleUrl: './input-autocomplete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.id]': 'null' },
})
export class InputAutocomplete {
  readonly id = input<string>('');
  readonly icon = input<string>('');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly options = input<readonly string[]>([]);
  readonly maxLength = input<number>(100);
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);
  readonly describedBy = input<Nullable<string>>(null);
  readonly debounceMs = input<number>(250);

  readonly valueChange = output<string>();
  /** Debounced while typing, immediate on focus. */
  readonly search = output<string>();

  protected readonly currentValue = linkedSignal(() => this.value());
  protected readonly hasFocus = signal(false);
  private readonly dismissed = signal(false);
  /** Reset to "no active option" whenever new options arrive. */
  protected readonly activeIndex = linkedSignal<readonly string[], number>({
    source: () => this.options(),
    computation: () => -1,
  });

  protected readonly listboxId = computed(() => `${this.id()}-listbox`);
  protected readonly isOpen = computed(
    () => this.hasFocus() && !this.dismissed() && this.options().length > 0,
  );
  protected readonly items = computed<readonly AutocompleteItem[]>(() =>
    this.options().map((label, index) => ({ label, id: this.optionId(index) })),
  );
  protected readonly comboboxRole = 'combobox';
  protected readonly autocompleteMode = 'list';
  protected readonly activeOptionId = computed(() =>
    this.isOpen() && this.activeIndex() >= 0 ? this.optionId(this.activeIndex()) : null,
  );

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  protected optionId(index: number): string {
    return `${this.id()}-option-${index}`;
  }

  protected onFocus(): void {
    this.hasFocus.set(true);
    this.dismissed.set(false);
    this.clearTimer();
    this.search.emit(this.currentValue());
  }

  protected onBlur(): void {
    this.hasFocus.set(false);
  }

  protected onValueChange(text: string): void {
    this.currentValue.set(text);
    this.valueChange.emit(text);
    this.dismissed.set(false);
    this.clearTimer();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.search.emit(text);
    }, this.debounceMs());
  }

  protected onKeyPressed(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (this.options().length === 0) {
          return;
        }
        event.preventDefault();
        this.dismissed.set(false);
        this.activeIndex.set(
          nextActiveIndex(
            this.isOpen() ? this.activeIndex() : -1,
            this.options().length,
            event.key === 'ArrowDown' ? 1 : -1,
          ),
        );
        break;
      }
      case 'Enter': {
        const index = this.activeIndex();
        if (this.isOpen() && index >= 0) {
          event.preventDefault();
          this.select(index);
        }
        break;
      }
      case 'Escape': {
        if (this.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.dismissed.set(true);
        }
        break;
      }
    }
  }

  /** Keeps the focus in the field: a blur would close the list before the selection. */
  protected onOptionMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault();
    this.select(index);
  }

  private select(index: number): void {
    const option = this.options()[index];
    if (option === undefined) {
      return;
    }
    this.currentValue.set(option);
    this.valueChange.emit(option);
    this.clearTimer();
    this.dismissed.set(true);
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
