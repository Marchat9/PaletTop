import { computed, DestroyRef, Signal, signal } from '@angular/core';

/**
 * Turns the pages of a list on its own, for the spectator screens nobody touches (projection):
 * one page every `intervalMs`, back to the first after the last, still when everything fits.
 *
 * A data update keeps the current page (pulled back within bounds when the list shrinks): the
 * rotation goes on instead of jumping back to the start at every score.
 */
export class AutoPager {
  private readonly current = signal(0);

  readonly pageCount: Signal<number>;
  readonly page: Signal<number>;
  /** Index of the first item of the page shown. */
  readonly start: Signal<number>;

  constructor(
    total: Signal<number>,
    private readonly pageSize: Signal<number>,
    readonly intervalMs: number,
    destroyRef: DestroyRef,
  ) {
    this.pageCount = computed(() => Math.max(1, Math.ceil(total() / Math.max(1, this.pageSize()))));
    this.page = computed(() => Math.min(this.current(), this.pageCount() - 1));
    this.start = computed(() => this.page() * Math.max(0, this.pageSize()));

    const timer = setInterval(() => this.next(), intervalMs);
    destroyRef.onDestroy(() => clearInterval(timer));
  }

  private next(): void {
    const count = this.pageCount();
    this.current.set(count > 1 ? (this.page() + 1) % count : 0);
  }
}
