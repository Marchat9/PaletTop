import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A podium step as displayed. */
export interface PodiumStepView {
  key: string;
  place: number;
  rankLabel: string;
  /** Names shown, one element each (one per line on mobile). */
  names: string[];
  /** Tied names beyond those shown (« +2 »); 0 when all are shown. */
  hiddenCount: number;
  summary: string;
  isHighlighted: boolean;
}

/**
 * The podium of a leaderboard: second, first, third, the first step being the highest. It only
 * draws the steps it is given (see `podiumSteps`); `app-leaderboard` builds them.
 */
@Component({
  selector: 'app-leaderboard-podium',
  templateUrl: './leaderboard-podium.html',
  styleUrl: './leaderboard-podium.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.large]': 'large()' },
})
export class LeaderboardPodium {
  public readonly steps = input.required<PodiumStepView[]>();
  /** Read from afar (spectator screens): larger text. */
  public readonly large = input<boolean>(false);
}
