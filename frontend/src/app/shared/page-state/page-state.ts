import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';

export type PageStateTone = 'loading' | 'error' | 'empty';

const DEFAULT_ICONS: Record<PageStateTone, string> = {
  loading: 'progress_activity',
  error: 'error',
  empty: 'info',
};

/**
 * What a page shows instead of its content: loading, an error (with the ways out projected as
 * actions: type the codes again, go home…) or nothing to show.
 */
@Component({
  selector: 'app-page-state',
  imports: [Icon],
  templateUrl: './page-state.html',
  styleUrl: './page-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageState {
  public readonly tone = input<PageStateTone>('empty');
  public readonly message = input.required<string>();
  public readonly description = input<Nullable<string>>(null);
  /** Replaces the icon of the tone. */
  public readonly icon = input<Nullable<string>>(null);

  public readonly resolvedIcon = computed(() => this.icon() ?? DEFAULT_ICONS[this.tone()]);
  public readonly role = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));
}
