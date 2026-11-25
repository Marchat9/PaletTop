import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { BracketRepechedList } from 'src/app/utils/repeched.util';

/** Who was brought back to each bracket after losing its first round, with the lost score. */
@Component({
  selector: 'app-repeched-list',
  imports: [CardCollapsible, Icon],
  templateUrl: './repeched-list.html',
  styleUrl: './repeched-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepechedList {
  public readonly brackets = input.required<BracketRepechedList[]>();
}
