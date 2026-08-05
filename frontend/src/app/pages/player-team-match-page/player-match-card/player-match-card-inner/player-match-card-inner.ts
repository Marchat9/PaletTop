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
import { ValidateMatch } from 'src/app/models/match-validate-score.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TeamScoreUpdate } from 'src/app/models/score-update.model';
import { StartMatch } from 'src/app/models/start-match.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { MatchTimerComponent } from 'src/app/shared/match-timer/match-timer';
import { ScoreNumber } from 'src/app/shared/score-number/score-number';

@Component({
  selector: 'app-player-match-card-inner',
  standalone: true,
  imports: [Button, ScoreNumber, InputText, MatchTimerComponent, Icon],
  templateUrl: './player-match-card-inner.html',
  styleUrl: './player-match-card-inner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchCardInnerComponent {
  // ======= Input / Output =======
  public readonly match = input.required<PlayerMatchDto>();
  public readonly teamId = input.required<string>();
  public readonly teamCode = input.required<string>();
  public readonly pointsPerGame = input.required<number>();

  // errors for hint
  public readonly startMatchError = input<Nullable<string>>();
  public readonly updateScoreError = input<Nullable<string>>();
  public readonly validateMatchError = input<Nullable<string>>();

  // loading
  public readonly startMatchLoading = input<boolean>(false);
  public readonly validateMatchLoading = input<boolean>(false);

  // outputs
  public readonly startMatch = output<StartMatch>();
  public readonly updateScore = output<TeamScoreUpdate>();
  public readonly validateMatch = output<ValidateMatch>();
  // ==============================

  // ========= Local data =========
  public readonly localMyScore = signal(0);
  public readonly localOpponentScore = signal(0);
  public readonly opponentCode = signal('');
  // ==============================

  // ========== Computed ==========
  public readonly isBye = computed(() => this.match().isBye);
  public readonly isTeamA = computed(() => this.match().teamA.id === this.teamId());

  public readonly isPending = computed(() => this.match().status === 'PENDING');
  public readonly isOngoing = computed(() => this.match().status === 'ONGOING');
  public readonly isValidated = computed(() => this.match().status === 'VALIDATED');
  public readonly isEnded = computed(() => {
    const match = this.match();
    if (match.status === 'ENDED') return true;
    if (this.isValidated() || this.isPending()) return false;
    const max = this.pointsPerGame();
    return this.localMyScore() >= max || this.localOpponentScore() >= max;
  });
  public readonly myScore = computed(() => {
    const match = this.match();
    return this.isTeamA() ? match.scoreA : match.scoreB;
  });
  public readonly opponentScore = computed(() => {
    const match = this.match();
    return this.isTeamA() ? match.scoreB : match.scoreA;
  });
  public readonly opponentName = computed(() => {
    const match = this.match();
    return this.isTeamA() ? (match.teamB?.name ?? '—') : match.teamA.name;
  });
  // ==============================

  constructor() {
    // initialisation
    effect(() => {
      this.localMyScore.set(this.myScore());
      this.localOpponentScore.set(this.opponentScore());
    });

    // On matchId change, reset opponentCode field.
    effect(() => {
      this.match().id;
      untracked(() => this.opponentCode.set(''));
    });
  }

  public onMyScoreChange(value: number): void {
    this.localMyScore.set(value);
    this.emitScore();
  }

  public onOpponentScoreChange(value: number): void {
    this.localOpponentScore.set(value);
    this.emitScore();
  }

  public onStartMatch(match: PlayerMatchDto, teamCode: string): void {
    this.startMatch.emit({ matchId: match.id, teamCode: teamCode });
  }

  public onValidateMatch(match: PlayerMatchDto, teamCode: string, opponentTeamCode: string): void {
    this.validateMatch.emit({ matchId: match.id, teamCode, opponentTeamCode });
  }

  private emitScore(): void {
    const scoreA = this.isTeamA() ? this.localMyScore() : this.localOpponentScore();
    const scoreB = this.isTeamA() ? this.localOpponentScore() : this.localMyScore();
    this.updateScore.emit({ matchId: this.match().id, teamCode: this.teamCode(), scoreA, scoreB });
  }
}
