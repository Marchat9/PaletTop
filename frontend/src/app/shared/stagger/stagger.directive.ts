import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Fait apparaître les enfants directs de l'hôte en cascade (cf. `.stagger` dans
 * styles/animations.scss).
 *
 * La valeur passée sert de clé de rejeu : quand elle change, la cascade repart.
 * Typiquement l'identifiant du round affiché, pour rejouer l'apparition des matchs
 * à chaque génération.
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

      // Au premier rendu la classe posée par `host` suffit : inutile de la retirer
      // pour la remettre, l'animation vient déjà de démarrer.
      if (this.isFirstRun) {
        this.isFirstRun = false;
        return;
      }

      const element = this.elementRef.nativeElement;
      element.classList.remove('stagger');
      // Reflow forcé : sans lui le navigateur regroupe retrait et ajout, et l'animation ne repart pas.
      void element.offsetWidth;
      element.classList.add('stagger');
    });
  }
}
