import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LiveMatchView } from 'src/app/models/live-match.model';
import { Nullable } from 'src/app/models/nullable.model';
import { AnimateOnChangeDirective } from '../animate-on-change/animate-on-change.directive';
import { FitCountDirective } from '../fit-count/fit-count.directive';
import { MatchStatusComponent } from '../match-status/match-status';
import { MatchTimerComponent } from '../match-timer/match-timer';
import { byeLabelOf } from 'src/app/utils/bye-label.util';

/** A tile of the board: the match and, for a bye, what its badge says. */
interface LiveMatchTile extends LiveMatchView {
  byeLabel: string;
  /** Timer next to the status, once the match has started (never for a bye). */
  showTimer: boolean;
}

/** Height of a tile plus the gap below it, in rem: what a page is cut by. */
export const LIVE_MATCH_TILE_REM = 6.6;

/**
 * Matches of the round on the spectator screens, one tile each with its status colour and large
 * scores. Shows a window of the matches (`pageStart`, `pageSize`) for the automatic pagination;
 * with `fillHeight`, it takes the height it is given and says how many tiles fit in it.
 */
@Component({
  selector: 'app-live-match-board',
  imports: [MatchStatusComponent, MatchTimerComponent, AnimateOnChangeDirective, FitCountDirective],
  templateUrl: './live-match-board.html',
  styleUrl: './live-match-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveMatchBoard {
  public readonly matches = input<LiveMatchView[]>([]);
  public readonly pageStart = input<number>(0);
  /** All the matches without a page size (mobile, where the page scrolls). */
  public readonly pageSize = input<Nullable<number>>(null);
  public readonly fillHeight = input<boolean>(false);
  public readonly emptyLabel = input<string>('Aucun match pour le moment.');

  /** How many tiles fit in the height given (`fillHeight` only). */
  public readonly capacityChange = output<number>();

  protected readonly tileRem = LIVE_MATCH_TILE_REM;

  protected readonly visibleMatches = computed<LiveMatchTile[]>(() => {
    const size = this.pageSize();
    const matches = this.matches();
    const visible = size ? matches.slice(this.pageStart(), this.pageStart() + size) : matches;
    return visible.map((match) => ({
      ...match,
      byeLabel: byeLabelOf(match),
      showTimer: !match.isBye && match.status !== 'PENDING',
    }));
  });
}
