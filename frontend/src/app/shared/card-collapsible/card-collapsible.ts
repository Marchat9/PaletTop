import { ChangeDetectionStrategy, Component, OnInit, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-card-collapsible',
  standalone: true,
  imports: [Icon],
  templateUrl: './card-collapsible.html',
  styleUrl: './card-collapsible.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCollapsible implements OnInit {
  readonly defaultExpanded = input(true, { alias: 'isExpanded' });
  readonly isExpanded = signal(true);

  ngOnInit(): void {
    this.isExpanded.set(this.defaultExpanded());
  }

  toggleExpanded(): void {
    this.isExpanded.update((value) => !value);
  }
}
