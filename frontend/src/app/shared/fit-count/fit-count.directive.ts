import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * How many items of `itemPx` fit in `heightPx`, once `reservedPx` (headers, footers) is taken out,
 * over `columns` columns. Always at least one, so a page is never empty.
 */
export function fitCount(
  heightPx: number,
  itemPx: number,
  reservedPx: number,
  columns: number,
): number {
  if (itemPx <= 0) {
    return Math.max(1, columns);
  }
  const perColumn = Math.max(1, Math.floor((heightPx - reservedPx) / itemPx));
  return perColumn * Math.max(1, columns);
}

/**
 * Measures its element and emits how many items of a fixed height fit in it: the spectator lists
 * cut their pages to the screen instead of scrolling. Re-emits on every resize, only on change.
 *
 * ```html
 * <div class="list" [appFitCount]="2.75" [fitReserved]="2" (fitCountChange)="pageSize.set($event)">
 * ```
 */
@Directive({ selector: '[appFitCount]' })
export class FitCountDirective {
  /** Height of one item, in rem (gap included). */
  public readonly itemHeightRem = input.required<number>({ alias: 'appFitCount' });
  /** Height of what the element shows besides the items (table header...), in rem. */
  public readonly reservedRem = input<number>(0, { alias: 'fitReserved' });
  public readonly columns = input<number>(1, { alias: 'fitColumns' });

  public readonly fitCountChange = output<number>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly height = signal(0);
  private lastCount: number | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const target = this.element.nativeElement;
      this.height.set(target.clientHeight);
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.height.set(target.clientHeight));
      observer.observe(target);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    effect(() => {
      const height = this.height();
      if (height <= 0) {
        return;
      }
      const rem = remInPx();
      const count = fitCount(
        height,
        this.itemHeightRem() * rem,
        this.reservedRem() * rem,
        this.columns(),
      );
      if (count !== this.lastCount) {
        this.lastCount = count;
        this.fitCountChange.emit(count);
      }
    });
  }
}

function remInPx(): number {
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}
