import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Pastille d'initiales : deux lettres pour un prénom et un nom, une seule si le nom tient
 * en un mot ou si `maxLetters` vaut 1.
 *
 * Décoratif — le nom complet est toujours affiché à côté, la pastille est donc masquée aux
 * lecteurs d'écran.
 */
@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  public readonly name = input.required<string>();
  public readonly size = input<'small' | 'normal'>('normal');
  public readonly maxLetters = input<1 | 2>(2);

  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return '?';
    }

    const first = words[0].charAt(0).toUpperCase();
    if (this.maxLetters() === 1 || words.length === 1) {
      return first;
    }

    // Premier et dernier mot : « Jean-Pierre Martin » donne JM, pas JP.
    return first + words[words.length - 1].charAt(0).toUpperCase();
  });
}
