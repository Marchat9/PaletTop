import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export interface InputChipOption {
  value: number;
  label: string;
  /**
   * Cannot be unchecked. The parent still owns the value: a locked option shows as checked only if
   * it is part of `value`, so what the pills show is always what the form holds.
   */
  locked?: boolean;
}

/**
 * Compact multiple choice: a few pills to tick, where a list of checkboxes would take the full
 * width.
 */
@Component({
  selector: 'app-input-chips',
  standalone: true,
  imports: [Icon],
  templateUrl: './input-chips.html',
  styleUrl: './input-chips.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputChips {
  public readonly options = input<readonly InputChipOption[]>([]);
  public readonly value = input<readonly number[]>([]);
  public readonly name = input<string>('');

  public readonly valueChange = output<number[]>();

  protected isSelected(option: InputChipOption): boolean {
    return this.value().includes(option.value);
  }

  protected toggle(option: InputChipOption): void {
    if (option.locked) {
      return;
    }

    const current = this.value();
    const next = current.includes(option.value)
      ? current.filter((value) => value !== option.value)
      : [...current, option.value];

    this.valueChange.emit([...next].sort((a, b) => a - b));
  }
}
