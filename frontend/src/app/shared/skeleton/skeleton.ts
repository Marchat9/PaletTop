import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Blocs en attente affichés pendant un appel API, à la forme du contenu qui va les remplacer.
 *
 * ```html
 * @if (isLoading()) {
 *   <app-skeleton [rows]="3" />
 * } @else { … }
 * ```
 */
@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  public readonly rows = input<number>(3);
  public readonly height = input<string>('2.75rem');

  protected readonly rowIndexes = computed(() =>
    Array.from({ length: Math.max(1, this.rows()) }, (_, index) => index),
  );
}
