import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LeaderboardRow, LeaderboardTable } from 'src/app/models/leaderboard.model';
import { Nullable } from 'src/app/models/nullable.model';
import { podiumSteps, rowsBelowPodium } from 'src/app/utils/leaderboard.util';
import { CardCollapsible } from '../card-collapsible/card-collapsible';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';

/** Names shown on a podium step before « +N » takes over (many players tied first). */
const PODIUM_MAX_NAMES = 3;

const EMPTY_TABLE: LeaderboardTable = { nameLabel: '', columns: [], rows: [], legend: null };

/** A podium step as displayed. */
interface PodiumStepView {
  key: string;
  place: number;
  rankLabel: string;
  names: string;
  summary: string;
  isHighlighted: boolean;
}

/**
 * The one leaderboard of the application: tournament teams, session players or club members, built
 * with the `to…Leaderboard` utilities. Optional podium (the first three places, ties grouped),
 * highlighted row, and a window over the rows below the podium for the spectator pagination.
 *
 * Buttons of the caller (PDF download, club leaderboard...) are projected with `leaderboardActions`.
 */
@Component({
  selector: 'app-leaderboard',
  imports: [CardCollapsible, Icon, Skeleton, NgTemplateOutlet],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leaderboard {
  // ======= Input =======
  public readonly table = input<LeaderboardTable>(EMPTY_TABLE);
  public readonly highlightedId = input<Nullable<string>>(null);
  /** Badge next to the highlighted name (« vous »); none when null. */
  public readonly highlightLabel = input<Nullable<string>>(null);
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

  /** Window over the rows below the podium (all of them without a `pageSize`). */
  public readonly pageStart = input<number>(0);
  public readonly pageSize = input<Nullable<number>>(null);
  /** The rows of the window side by side in two tables (wide spectator screens). */
  public readonly listColumns = input<1 | 2>(1);
  // =====================

  protected readonly hasRows = computed(() => this.table().rows.length > 0);

  protected readonly podium = computed<PodiumStepView[]>(() => {
    if (!this.showPodium()) {
      return [];
    }
    const highlighted = this.highlightedId();
    return podiumSteps(this.table().rows).map((step) => {
      const extra = step.names.length - PODIUM_MAX_NAMES;
      const shown = step.names.slice(0, PODIUM_MAX_NAMES).join(' · ');
      return {
        key: step.ids.join('|'),
        place: step.place,
        rankLabel: step.rankLabel,
        names: extra > 0 ? `${shown} +${extra}` : shown,
        summary: step.summary,
        isHighlighted: !!highlighted && step.ids.includes(highlighted),
      };
    });
  });

  /** Rows of the tables: below the podium when it is shown, then cut to the window. */
  private readonly listRows = computed<LeaderboardRow[]>(() => {
    const rows = this.showPodium() ? rowsBelowPodium(this.table().rows) : this.table().rows;
    const size = this.pageSize();
    return size ? rows.slice(this.pageStart(), this.pageStart() + size) : rows;
  });

  protected readonly tables = computed<LeaderboardRow[][]>(() => {
    const rows = this.listRows();
    if (rows.length === 0) {
      return [];
    }
    if (this.listColumns() === 1 || rows.length < 2) {
      return [rows];
    }
    const half = Math.ceil(rows.length / 2);
    return [rows.slice(0, half), rows.slice(half)];
  });
}
