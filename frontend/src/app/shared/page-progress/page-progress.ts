import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';

/**
 * Where an automatic rotation stands (spectator screens): a bar filling up until the next page,
 * one dot per page and « 2 / 3 ». Nothing when everything fits on one page.
 */
@Component({
  selector: 'app-page-progress',
  imports: [],
  templateUrl: './page-progress.html',
  styleUrl: './page-progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageProgress {
  /** Page shown, from 0. */
  public readonly page = input<number>(0);
  public readonly pageCount = input<number>(1);
  /** Time a page stays on screen: the bar fills up in that time. */
  public readonly intervalMs = input<number>(12_000);
  /** What the page shows (« Rangs 4 – 15 »). */
  public readonly label = input<Nullable<string>>(null);

  protected readonly isVisible = computed(() => this.pageCount() > 1);
  protected readonly dots = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index),
  );
  /** A new element per page restarts the bar animation. */
  protected readonly barKeys = computed(() => [this.page()]);
  protected readonly duration = computed(() => `${this.intervalMs()}ms`);
  protected readonly position = computed(() => `${this.page() + 1} / ${this.pageCount()}`);
}
