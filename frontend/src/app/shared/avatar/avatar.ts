import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Initials pill: two letters for a first name and a last name, only one when the name fits in a
 * single word or when `maxLetters` is 1.
 *
 * Decorative - the full name is always shown next to it, so the pill is hidden from screen readers.
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

    // First and last word: "Jean-Pierre Martin" gives JM, not JP.
    return first + words[words.length - 1].charAt(0).toUpperCase();
  });
}
