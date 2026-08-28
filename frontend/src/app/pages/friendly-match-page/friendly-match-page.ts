import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  resetFriendlyMatch,
  resetHistoryMatch,
  setTargetScore,
  setTeam1Name,
  setTeam2Name,
  startNextMatch,
  updateTeam1Score,
  updateTeam2Score,
} from 'src/app/store/friendly-match/friendly-match.actions';
import {
  selectIsMatchFinished,
  selectMatchHistory,
  selectTargetScore,
  selectTeam1Name,
  selectTeam1Score,
  selectTeam2Name,
  selectTeam2Score,
  selectWinner,
} from 'src/app/store/friendly-match/friendly-match.selectors';
import { FriendlyMatchConfig } from './components/friendly-match-config/friendly-match-config';
import { FriendlyMatchHistory } from './components/friendly-match-history/friendly-match-history';
import { FriendlyMatchScore } from './components/friendly-match-score/friendly-match-score';
import { initialFriendlyMatchState } from 'src/app/store/friendly-match/friendly-match.reducer';

@Component({
  selector: 'app-friendly-match-page',
  imports: [FriendlyMatchConfig, FriendlyMatchScore, FriendlyMatchHistory],
  templateUrl: './friendly-match-page.html',
  styleUrl: './friendly-match-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendlyMatchPageComponent {
  private readonly store = inject(Store);

  readonly team1Name = this.store.selectSignal(selectTeam1Name);
  readonly team2Name = this.store.selectSignal(selectTeam2Name);
  readonly targetScore = this.store.selectSignal(selectTargetScore);
  readonly team1Score = this.store.selectSignal(selectTeam1Score);
  readonly team2Score = this.store.selectSignal(selectTeam2Score);
  readonly isMatchFinished = this.store.selectSignal(selectIsMatchFinished);
  readonly winner = this.store.selectSignal(selectWinner);
  readonly matchHistory = this.store.selectSignal(selectMatchHistory);

  readonly hasModifications = computed(() => {
    const hasHistory = this.matchHistory().length > 0;
    const hasNamesChanged =
      this.team1Name() !== initialFriendlyMatchState.team1Name ||
      this.team2Name() !== initialFriendlyMatchState.team2Name;
    const hasTargetScoreChanged = this.targetScore() !== initialFriendlyMatchState.targetScore;
    const hasScoreChanged = this.team1Score() || this.team2Score();

    return hasHistory || hasNamesChanged || hasTargetScoreChanged || !!hasScoreChanged;
  });

  onTeam1NameChange(name: string): void {
    this.store.dispatch(setTeam1Name({ name }));
  }

  onTeam2NameChange(name: string): void {
    this.store.dispatch(setTeam2Name({ name }));
  }

  onTargetScoreChange(targetScore: number): void {
    this.store.dispatch(setTargetScore({ targetScore }));
  }

  onTeam1ScoreChange(score: number): void {
    this.store.dispatch(updateTeam1Score({ score }));
  }

  onTeam2ScoreChange(score: number): void {
    this.store.dispatch(updateTeam2Score({ score }));
  }

  onNextMatch(): void {
    this.store.dispatch(startNextMatch());
  }

  onDeleteHistory(): void {
    this.store.dispatch(resetHistoryMatch());
  }

  onReset(): void {
    this.store.dispatch(resetFriendlyMatch());
  }
}
