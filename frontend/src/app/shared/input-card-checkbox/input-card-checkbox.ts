import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';
import { InputCardRadioOption } from '../input-card-radio/input-card-radio';

interface CardCheckboxView<T> {
  option: InputCardRadioOption<T>;
  selected: boolean;
  /** The last selected card can't be unselected when `minSelected` is reached. */
  locked: boolean;
}

/** Same look as `app-input-card-radio`, but several cards can be selected. */
@Component({
  selector: 'app-input-card-checkbox',
  imports: [Icon],
  templateUrl: './input-card-checkbox.html',
  styleUrl: '../input-card-radio/input-card-radio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputCardCheckbox),
      multi: true,
    },
  ],
})
export class InputCardCheckbox<T> implements ControlValueAccessor {
  readonly options = input<readonly InputCardRadioOption<T>[]>([]);
  readonly value = input<readonly T[]>([]);
  readonly columns = input<number>(2);
  /** Minimum number of selected cards: the last ones can't be unselected. */
  readonly minSelected = input<number>(0);

  readonly valueChange = output<T[]>();

  protected readonly internalValue = signal<readonly T[]>([]);
  protected readonly cards = computed<CardCheckboxView<T>[]>(() => {
    const selectedValues = this.internalValue();
    const atMinimum = selectedValues.length <= this.minSelected();
    return this.options().map((option) => {
      const selected = selectedValues.includes(option.value);
      return { option, selected, locked: selected && atMinimum };
    });
  });

  private isControlValueAccessorActive = false;
  private onChangeFn: (v: T[]) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor() {
    effect(() => {
      if (!this.isControlValueAccessorActive) {
        this.internalValue.set(this.value());
      }
    });
  }

  writeValue(value: T[] | null): void {
    this.internalValue.set(value ?? []);
  }

  registerOnChange(fn: (v: T[]) => void): void {
    this.isControlValueAccessorActive = true;
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  onToggle(card: CardCheckboxView<T>): void {
    if (card.locked) {
      return;
    }
    const current = this.internalValue();
    // Keep the options order, so the stored list follows the display order.
    const next = this.options()
      .map((option) => option.value)
      .filter((value) => (value === card.option.value ? !card.selected : current.includes(value)));
    this.internalValue.set(next);
    this.valueChange.emit(next);
    this.onChangeFn(next);
    this.onTouchedFn();
  }
}
