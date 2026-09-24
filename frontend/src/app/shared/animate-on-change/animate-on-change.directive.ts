import { Directive, ElementRef, effect, inject, input, untracked } from '@angular/core';

export type AnimateOnChangeName = 'pulse' | 'slide-in' | 'fade-in';

/**
 * Rejoue une animation à chaque fois que la valeur observée change (cf.
 * `.animate-*` dans styles/animations.scss).
 *
 * - `pulse` : anneau qui s'écarte, pour signaler un score qui vient de bouger.
 * - `slide-in` / `fade-in` : pour un bloc dont le contenu est remplacé.
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
  /** Joue aussi l'animation au premier rendu — utile quand le bloc arrive après un chargement. */
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
      // Reflow forcé, sinon le navigateur regroupe retrait et ajout et l'animation ne repart pas.
      void element.offsetWidth;
      element.classList.add(animationClass);
    });
  }
}
