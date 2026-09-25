import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import {
  PlayerByeCopy,
  PlayerMatchEmptyTone,
  PlayerMatchView,
  PlayerValidationCopy,
} from 'src/app/models/player-match-view.model';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { InputText } from '../input-text/input-text';
import { MatchStatusComponent } from '../match-status/match-status';
import { MatchTimerComponent } from '../match-timer/match-timer';
import { ScoreNumber } from '../score-number/score-number';

const DEFAULT_BYE_COPY: PlayerByeCopy = {
  title: 'Exempté',
  message: 'Vous ne jouez pas ce round.',
};

const DEFAULT_VALIDATION_COPY: PlayerValidationCopy = {
  hint: 'Pour valider le score, demandez son code à votre adversaire.',
  placeholder: 'Code adverse',
};

/**
 * Card of the current match on the player side: start, entry of both scores, validation through the
 * opponent code.
 *
 * Shared between the tournament and the training session. It knows neither of them: it receives an
 * already projected `PlayerMatchView` and emits bare intents, which the page turns into actions.
 * Without a match it keeps the box and only hosts the content projected by the page - the "not
 * started yet", "finished" and "cancelled" states do not mean the same thing on both sides.
 */
@Component({
  selector: 'app-player-match-card',
  imports: [Button, ScoreNumber, InputText, MatchTimerComponent, Icon, MatchStatusComponent],
  templateUrl: './player-match-card.html',
  styleUrl: './player-match-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchCard {
  // ======= Input / Output =======
  public readonly match = input<Nullable<PlayerMatchView>>(null);
  public readonly pointsPerGame = input<number>(13);
  public readonly byeCopy = input<PlayerByeCopy>(DEFAULT_BYE_COPY);
  public readonly validationCopy = input<PlayerValidationCopy>(DEFAULT_VALIDATION_COPY);
  /**
   * Closed event: starting a match and entering a score are no longer accepted, but the validation
   * of a score already recorded stays open - otherwise a match finished just before the closing
   * would be lost.
   */
  public readonly scoringLocked = input<boolean>(false);
  /**
   * Look of the box shown when there is no match: neutral by default, festive for the end of an
   * event. The page does not put a class on a box it does not render.
   */
  public readonly emptyTone = input<PlayerMatchEmptyTone>('neutral');

  public readonly startError = input<Nullable<string>>(null);
  public readonly scoreError = input<Nullable<string>>(null);
  public readonly validateError = input<Nullable<string>>(null);
  public readonly startLoading = input<boolean>(false);
  public readonly validateLoading = input<boolean>(false);

  public readonly startMatch = output<void>();
  public readonly scoreChange = output<{ myScore: number; opponentScore: number }>();
  public readonly validateMatch = output<string>();
  // ==============================

  // Local scores: the entry must stay smooth without waiting for the server round trip.
  protected readonly localMyScore = signal(0);
  protected readonly localOpponentScore = signal(0);
  protected readonly opponentCode = signal('');

  protected readonly isPending = computed(() => this.match()?.status === 'PENDING');
  protected readonly isValidated = computed(() => this.match()?.status === 'VALIDATED');
  protected readonly isEnded = computed(() => {
    const match = this.match();
    if (!match) {
      return false;
    }
    if (match.status === 'ENDED') {
      return true;
    }
    if (this.isValidated() || this.isPending()) {
      return false;
    }
    // The target score reached locally opens the validation without waiting for the server.
    const max = this.pointsPerGame();
    return this.localMyScore() >= max || this.localOpponentScore() >= max;
  });

  constructor() {
    effect(() => {
      const match = this.match();
      if (!match) {
        return;
      }
      this.localMyScore.set(match.myScore);
      this.localOpponentScore.set(match.opponentScore);
    });

    // A new match starts over with an empty code field.
    effect(() => {
      this.match()?.id;
      untracked(() => this.opponentCode.set(''));
    });
  }

  protected onMyScoreChange(value: number): void {
    this.localMyScore.set(value);
    this.emitScore();
  }

  protected onOpponentScoreChange(value: number): void {
    this.localOpponentScore.set(value);
    this.emitScore();
  }

  protected onValidate(): void {
    this.validateMatch.emit(this.opponentCode());
  }

  private emitScore(): void {
    this.scoreChange.emit({
      myScore: this.localMyScore(),
      opponentScore: this.localOpponentScore(),
    });
  }
}
