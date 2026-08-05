import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from '../icon/icon';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'error';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly title = input<Nullable<string>>();
  readonly variant = input<ButtonVariant>('primary');
  readonly icon = input<string>();
  readonly loading = input<boolean>(false);
  readonly large = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly stopPropagation = input<boolean>(false);
  readonly clicked = output<Event>();

  onClick(event: Event): void {
    if (this.stopPropagation()) {
      event.stopPropagation();
    }

    if (this.disabled() || this.loading()) {
      return;
    }

    this.clicked.emit(event);
  }
}
