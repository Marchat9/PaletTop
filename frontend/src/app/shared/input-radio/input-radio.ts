import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export interface InputRadioOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-input-radio',
  imports: [Icon],
  templateUrl: './input-radio.html',
  styleUrl: './input-radio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputRadio {
  readonly name = input.required<string>();
  readonly options = input<readonly InputRadioOption[]>([]);
  readonly value = input<string>('');

  readonly valueChange = output<string>();

  onChange(value: string): void {
    this.valueChange.emit(value);
  }
}
