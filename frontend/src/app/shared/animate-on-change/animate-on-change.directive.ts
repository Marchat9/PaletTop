import { Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';

export type AnimateOnChangeName = 'pulse' | 'slide-in' | 'fade-in';

/**
 * Replays an animation every time the watched value changes (see `.animate-*` in
 * styles/animations.scss).
 *
 * - `pulse`: ring that expands, to signal a score that has just moved.
 * - `slide-in` / `fade-in`: for a block whose content is replaced.
 *
 * ```html
 * <span class="score" [appAnimateOnChange]="match().scoreA">…</span>
 * <div [appAnimateOnChange]="sessionCode()" animation="slide-in" [animateOnInit]="true">…</div>
 * ```
 */
@Directive({
  selector: '[appAnimateOnChange]',
})
export class AnimateOnChangeDirective {
  readonly watchedValue = input<unknown>(null, { alias: 'appAnimateOnChange' });
  readonly animation = input<AnimateOnChangeName>('pulse');
  /** Also plays the animation on the first render - useful when the block arrives after a load. */
  readonly animateOnInit = input<boolean>(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private isFirstRun = true;

  constructor() {
    effect(() => {
      this.watchedValue();

      const isFirstRun = this.isFirstRun;
      this.isFirstRun = false;
      if (isFirstRun && !untracked(this.animateOnInit)) {
        return;
      }

      const element = this.elementRef.nativeElement;
      const animationClass = `animate-${untracked(this.animation)}`;
      element.classList.remove(animationClass);
      // Forced reflow, otherwise the browser groups the removal and the addition and the animation
      // does not restart.
      void element.offsetWidth;
      element.classList.add(animationClass);
    });
  }
}
