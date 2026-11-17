import { DialogRef } from '@angular/cdk/dialog';
import { booleanAttribute, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Share of its height a sheet must be dragged down to close once released. */
export const SWIPE_DISMISS_DISTANCE_RATIO = 0.25;
/** A quicker flick closes it however short it is, in px/ms. */
export const SWIPE_DISMISS_VELOCITY = 0.5;
/** Movement before a touch is read as a drag rather than a tap, in px. */
const DRAG_THRESHOLD_PX = 10;
const SETTLE_MS = 200;

/** A media query that matches; false where the browser cannot tell (tests, server). */
export function matchesMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** Whether a release closes the sheet: dragged far enough, or flicked. */
export function shouldDismiss(distancePx: number, elapsedMs: number, heightPx: number): boolean {
  if (distancePx <= 0) {
    return false;
  }
  const velocity = distancePx / Math.max(elapsedMs, 1);
  return (
    distancePx >= heightPx * SWIPE_DISMISS_DISTANCE_RATIO || velocity >= SWIPE_DISMISS_VELOCITY
  );
}

/**
 * Closes the dialog of a bottom sheet dragged down, like native mobile sheets: the sheet follows
 * the finger, closes past a quarter of its height or on a flick, and springs back otherwise. A
 * touch inside a list scrolled down scrolls the list instead, so the sheet only moves from its top.
 * Closing this way is a cancel: the dialog closes with no result.
 *
 * ```html
 * <div class="sheet" [appSwipeToDismiss]="isSheet">
 * ```
 */
@Directive({ selector: '[appSwipeToDismiss]' })
export class SwipeToDismissDirective {
  public readonly enabled = input(true, {
    alias: 'appSwipeToDismiss',
    transform: booleanAttribute,
  });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly dialogRef = inject(DialogRef, { optional: true });

  private tracking = false;
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private offset = 0;

  constructor() {
    // Listened by hand: preventing the page scroll while dragging needs a non-passive listener.
    const onStart = (event: TouchEvent) => this.onTouchStart(event);
    const onMove = (event: TouchEvent) => this.onTouchMove(event);
    const onEnd = () => this.onTouchEnd();
    this.element.addEventListener('touchstart', onStart, { passive: true });
    this.element.addEventListener('touchmove', onMove, { passive: false });
    this.element.addEventListener('touchend', onEnd);
    this.element.addEventListener('touchcancel', onEnd);
    inject(DestroyRef).onDestroy(() => {
      this.element.removeEventListener('touchstart', onStart);
      this.element.removeEventListener('touchmove', onMove);
      this.element.removeEventListener('touchend', onEnd);
      this.element.removeEventListener('touchcancel', onEnd);
    });
  }

  private onTouchStart(event: TouchEvent): void {
    this.tracking =
      this.enabled() &&
      !!this.dialogRef &&
      event.touches.length === 1 &&
      !this.isInScrolledArea(event.target);
    if (!this.tracking) {
      return;
    }
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = performance.now();
    this.dragging = false;
    this.offset = 0;
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.tracking) {
      return;
    }
    const touch = event.touches[0];
    const dy = touch.clientY - this.startY;
    const dx = touch.clientX - this.startX;

    if (!this.dragging) {
      if ((Math.abs(dx) > DRAG_THRESHOLD_PX && Math.abs(dx) > dy) || dy < -DRAG_THRESHOLD_PX) {
        // Sideways or upwards: a scroll or a gesture of the content, not ours.
        this.tracking = false;
        return;
      }
      if (dy <= 0 || dy < Math.abs(dx)) {
        return;
      }
      // Downwards from the top, where there is nothing to scroll: the gesture is claimed from its
      // first pixel. Waiting for the threshold lets the browser start an overscroll (pull to
      // refresh) it no longer gives back, and the drag can then no longer cancel it.
      if (!event.cancelable) {
        this.tracking = false;
        return;
      }
      event.preventDefault();
      if (dy <= DRAG_THRESHOLD_PX) {
        return;
      }
      this.dragging = true;
      this.element.style.transition = 'none';
    }

    if (event.cancelable) {
      event.preventDefault();
    }
    this.offset = Math.max(0, dy);
    this.element.style.transform = `translateY(${this.offset}px)`;
  }

  private onTouchEnd(): void {
    if (!this.tracking) {
      return;
    }
    this.tracking = false;
    if (!this.dragging) {
      return;
    }
    this.dragging = false;

    const elapsed = performance.now() - this.startTime;
    const dismiss = shouldDismiss(this.offset, elapsed, this.element.offsetHeight);
    const animate = !matchesMedia('(prefers-reduced-motion: reduce)');

    this.element.style.transition = animate ? `transform ${SETTLE_MS}ms ease-out` : 'none';
    if (dismiss) {
      this.element.style.transform = 'translateY(100%)';
      if (animate) {
        setTimeout(() => this.dialogRef?.close(), SETTLE_MS);
      } else {
        this.dialogRef?.close();
      }
    } else {
      this.element.style.transform = '';
    }
  }

  /** The touch landed in a list scrolled away from its top: dragging down scrolls it back. */
  private isInScrolledArea(target: EventTarget | null): boolean {
    let node = target instanceof HTMLElement ? target : null;
    while (node) {
      if (node.scrollTop > 0) {
        return true;
      }
      if (node === this.element) {
        return false;
      }
      node = node.parentElement;
    }
    return false;
  }
}
