import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

/** The discreet « ← Back to… » at the top left of a page. */
@Component({
  selector: 'app-back-link',
  imports: [Icon],
  templateUrl: './back-link.html',
  styleUrl: './back-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackLink {
  public readonly label = input.required<string>();

  public readonly clicked = output<void>();
}
