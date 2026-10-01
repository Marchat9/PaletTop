import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Brings the direct children of the host in one after another (see `.stagger` in
 * styles/animations.scss).
 *
 * The value passed acts as a replay key: when it changes, the cascade starts again. Typically the
 * id of the displayed round, to replay the appearance of the matches at every generation.
 *
 * ```html
 * <div class="match-list" [appStagger]="round().id">…</div>
 * ```
 */
@Directive({
  selector: '[appStagger]',
  host: { class: 'stagger' },
})
export class StaggerDirective {
  readonly replayKey = input<unknown>(null, { alias: 'appStagger' });

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private isFirstRun = true;

  constructor() {
    effect(() => {
      this.replayKey();

      // On the first render the class set by `host` is enough: no need to remove it to put it back,
      // the animation has just started.
      if (this.isFirstRun) {
        this.isFirstRun = false;
        return;
      }

      const element = this.elementRef.nativeElement;
      element.classList.remove('stagger');
      // Forced reflow: without it the browser groups the removal and the addition, and the
      // animation does not restart.
      void element.offsetWidth;
      element.classList.add('stagger');
    });
  }
}
