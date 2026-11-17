import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';

/**
 * - `info`: a plain piece of information, nothing is wrong;
 * - `alert`: something calls for an action, in a framed band.
 */
export type InlineNoticeTone = 'info' | 'alert';

const DEFAULT_ICONS: Record<InlineNoticeTone, string> = {
  info: 'info',
  alert: 'warning',
};

/** A short message under an action (why it is blocked, what it will do), with its icon. */
@Component({
  selector: 'app-inline-notice',
  imports: [Icon],
  templateUrl: './inline-notice.html',
  styleUrl: './inline-notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineNotice {
  public readonly tone = input<InlineNoticeTone>('info');
  /** Replaces the icon of the tone. */
  public readonly icon = input<Nullable<string>>(null);

  public readonly resolvedIcon = computed(() => this.icon() ?? DEFAULT_ICONS[this.tone()]);
}
