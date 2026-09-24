import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export interface InputChipOption {
  value: number;
  label: string;
  /** Toujours active et non décochable : elle fait partie du réglage par construction. */
  locked?: boolean;
}

/**
 * Choix multiple compact : quelques pastilles à cocher, là où une liste de cases à cocher
 * prendrait toute la largeur.
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
    return option.locked || this.value().includes(option.value);
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
