import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { MatchStatusComponent } from 'src/app/shared/match-status/match-status';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';

/** Statuses whose score is a result: the winner can be highlighted. */
const RESULT_STATUSES = ['ENDED', 'VALIDATED'];

/**
 * One match of an admin round: read view (one line on desktop, team-per-line card on mobile) and
 * the score correction, shared by the current round and the rounds history.
 */
@Component({
  selector: 'app-admin-match-row',
  imports: [
    AnimateOnChangeDirective,
    Button,
    Icon,
    InputNumber,
    MatchStatusComponent,
    MatchTimerComponent,
  ],
  templateUrl: './admin-match-row.html',
  styleUrl: './admin-match-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMatchRow {
  // ======= Input / Output =======
  public readonly match = input.required<SessionMatchDto>();
  public readonly pointsPerGame = input.required<number>();
  /** Shows the edit button: current round, or a previous round whose scores stay correctable. */
  public readonly editable = input<boolean>(true);
  public readonly editing = input<boolean>(false);
  public readonly saving = input<boolean>(false);
  /** Status badge and timer: only meaningful while the round is being played. */
  public readonly showLiveStatus = input<boolean>(true);

  public readonly editRequested = output<void>();
  public readonly editCancelled = output<void>();
  public readonly scoreSubmitted = output<ScoreUpdate>();
  // ==============================

  // Reset to the saved score each time the edition opens (or the match is updated meanwhile).
  public readonly draftScoreA = linkedSignal({
    source: () => ({ editing: this.editing(), score: this.match().scoreA }),
    computation: ({ score }) => score,
  });
  public readonly draftScoreB = linkedSignal({
    source: () => ({ editing: this.editing(), score: this.match().scoreB }),
    computation: ({ score }) => score,
  });

  private readonly hasResult = computed(() => RESULT_STATUSES.includes(this.match().status));
  public readonly isWinnerA = computed(
    () => this.hasResult() && this.match().scoreA > this.match().scoreB,
  );
  public readonly isWinnerB = computed(
    () => this.hasResult() && this.match().scoreB > this.match().scoreA,
  );
  public readonly scoreKey = computed(() => `${this.match().scoreA}-${this.match().scoreB}`);
  public readonly statusClass = computed(
    () => `status-badge status-badge--${this.match().status.toLowerCase()}`,
  );
  public readonly hasChanges = computed(
    () => this.draftScoreA() !== this.match().scoreA || this.draftScoreB() !== this.match().scoreB,
  );
  public readonly canDecrementA = computed(() => this.draftScoreA() > 0);
  public readonly canIncrementA = computed(() => this.draftScoreA() < this.pointsPerGame());
  public readonly canDecrementB = computed(() => this.draftScoreB() > 0);
  public readonly canIncrementB = computed(() => this.draftScoreB() < this.pointsPerGame());

  public stepScoreA(delta: number): void {
    this.draftScoreA.set(this.clamp(this.draftScoreA() + delta));
  }

  public stepScoreB(delta: number): void {
    this.draftScoreB.set(this.clamp(this.draftScoreB() + delta));
  }

  public setScoreA(value: number): void {
    this.draftScoreA.set(this.clamp(value));
  }

  public setScoreB(value: number): void {
    this.draftScoreB.set(this.clamp(value));
  }

  public submit(): void {
    this.scoreSubmitted.emit({
      matchId: this.match().id,
      scoreA: this.draftScoreA(),
      scoreB: this.draftScoreB(),
    });
  }

  private clamp(value: number): number {
    return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), this.pointsPerGame());
  }
}
