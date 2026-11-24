import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { LeaderboardItem, LeaderboardTable } from 'src/app/models/leaderboard.model';
import { Nullable } from 'src/app/models/nullable.model';
import { itemTables, leaderboardItems, podiumSteps } from 'src/app/utils/leaderboard.util';
import { CardCollapsible } from '../card-collapsible/card-collapsible';
import { FitCountDirective } from '../fit-count/fit-count.directive';
import { Icon } from '../icon/icon';
import { LeaderboardPodium, PodiumStepView } from '../leaderboard-podium/leaderboard-podium';
import { Skeleton } from '../skeleton/skeleton';

/** Height of a table row and of the table header in `fillHeight` mode, in rem (see the style). */
export const LEADERBOARD_ROW_REM = 2.75;
const LEADERBOARD_HEAD_REM = 2.2;

/** Names shown on a podium step before « +N » takes over (many players tied first). */
const PODIUM_MAX_NAMES = 3;

const EMPTY_TABLE: LeaderboardTable = { nameLabel: '', columns: [], rows: [], legend: null };

/**
 * The one leaderboard of the application: tournament teams, session players or club members, built
 * with the `to…Leaderboard` utilities. Optional podium (the first three places, ties grouped),
 * highlighted row, and a window over the rows below the podium for the spectator pagination.
 *
 * Buttons of the caller (PDF download, club leaderboard...) are projected with `leaderboardActions`.
 */
@Component({
  selector: 'app-leaderboard',
  imports: [
    CardCollapsible,
    Icon,
    LeaderboardPodium,
    Skeleton,
    NgTemplateOutlet,
    FitCountDirective,
  ],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.fill]': 'fillHeight()' },
})
export class Leaderboard {
  // ======= Input =======
  public readonly table = input<LeaderboardTable>(EMPTY_TABLE);
  public readonly highlightedId = input<Nullable<string>>(null);
  public readonly showPodium = input<boolean>(false);
  public readonly isLoading = input<boolean>(false);
  public readonly error = input<Nullable<string>>(null);
  public readonly emptyLabel = input<string>('Aucun classement pour le moment.');

  /** In a card with a header; without, only the content (popups, spectator panels). */
  public readonly framed = input<boolean>(true);
  public readonly canCollapse = input<boolean>(true);
  public readonly title = input<string>('Classement');
  public readonly icon = input<string>('leaderboard');
  public readonly description = input<Nullable<string>>(null);
  /** Title size of the page's other cards: large on tournament pages, compact on training ones. */
  public readonly titleSize = input<'large' | 'compact'>('large');

  /**
   * Window over what the tables list (rows below the podium and section headings, see
   * `leaderboardItems`); all of it without a `pageSize`.
   */
  public readonly pageStart = input<number>(0);
  public readonly pageSize = input<Nullable<number>>(null);
  /** The rows of the window side by side in two tables (wide spectator screens). */
  public readonly listColumns = input<1 | 2>(1);
  /**
   * Takes the height it is given (spectator screens): one-line rows, the tables cut to what fits,
   * and `capacityChange` tells how many items below the podium that is.
   */
  public readonly fillHeight = input<boolean>(false);
  // =====================

  // ======= Output =======
  public readonly capacityChange = output<number>();
  // ======================

  protected readonly rowRem = LEADERBOARD_ROW_REM;
  protected readonly headRem = LEADERBOARD_HEAD_REM;

  protected readonly hasRows = computed(() => this.table().rows.length > 0);

  protected readonly podium = computed<PodiumStepView[]>(() => {
    if (!this.showPodium()) {
      return [];
    }
    const highlighted = this.highlightedId();
    return podiumSteps(this.table().rows).map((step) => {
      return {
        key: step.ids.join('|'),
        place: step.place,
        rankLabel: step.rankLabel,
        names: step.names.slice(0, PODIUM_MAX_NAMES),
        hiddenCount: Math.max(0, step.names.length - PODIUM_MAX_NAMES),
        summary: step.summary,
        isHighlighted: !!highlighted && step.ids.includes(highlighted),
      };
    });
  });

  /** The tables of the window, each opening on its section heading when it has one. */
  protected readonly tables = computed<LeaderboardItem[][]>(() =>
    itemTables(
      leaderboardItems(this.table().rows, this.showPodium()),
      this.pageStart(),
      this.pageSize(),
      this.listColumns(),
    ),
  );
  /** Rank, name and statistics: what a section heading spans. */
  protected readonly columnCount = computed(() => 2 + this.table().columns.length);

  private readonly hasSections = computed(() => this.table().rows.some((row) => !!row.section));
  private readonly fitRows = signal<number | null>(null);

  constructor() {
    // A page or column may open on a repeated section heading: one slot per table is kept for it.
    effect(() => {
      const fit = this.fitRows();
      if (fit !== null) {
        const reserved = this.hasSections() ? this.listColumns() : 0;
        this.capacityChange.emit(Math.max(1, fit - reserved));
      }
    });
  }

  protected onFitCount(count: number): void {
    this.fitRows.set(count);
  }
}
