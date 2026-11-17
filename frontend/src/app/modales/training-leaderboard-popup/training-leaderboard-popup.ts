import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardError,
  selectTrainingLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';
import { toClubLeaderboard, toSessionLeaderboard } from 'src/app/utils/leaderboard.util';

/** Which leaderboard the popup shows: the session's, or the club's (every session added up). */
export type TrainingLeaderboardScope = 'session' | 'club';

export interface TrainingLeaderboardPopupData {
  scope: TrainingLeaderboardScope;
  /** Line of whoever reads it (participant for the session, member for the club); null: none. */
  highlightedId: Nullable<string>;
}

/**
 * Session or club leaderboard, opened from a session page. The page loads the leaderboard before
 * opening it; the popup reads it from the store, so it follows the live updates.
 */
@Component({
  selector: 'app-training-leaderboard-popup',
  imports: [Leaderboard, Icon],
  templateUrl: './training-leaderboard-popup.html',
  styleUrl: './training-leaderboard-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingLeaderboardPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<TrainingLeaderboardPopupData>(DIALOG_DATA);

  readonly isClub = this.data.scope === 'club';
  readonly highlightedId = this.data.highlightedId;

  private readonly sessionEntries = this.store.selectSignal(selectTrainingLeaderboard);
  private readonly clubEntries = this.store.selectSignal(selectTrainingClubLeaderboard);
  private readonly sessionLoading = this.store.selectSignal(selectTrainingLeaderboardIsLoading);
  private readonly clubLoading = this.store.selectSignal(selectTrainingClubLeaderboardIsLoading);
  private readonly sessionError = this.store.selectSignal(selectTrainingLeaderboardError);
  private readonly clubError = this.store.selectSignal(selectTrainingClubLeaderboardError);

  readonly table = computed(() =>
    this.isClub
      ? toClubLeaderboard(this.clubEntries())
      : toSessionLeaderboard(this.sessionEntries()),
  );
  readonly isLoading = computed(() => (this.isClub ? this.clubLoading() : this.sessionLoading()));
  readonly error = computed(() => (this.isClub ? this.clubError() : this.sessionError()));
  readonly emptyLabel = this.isClub
    ? "Aucun membre du club n'a encore de match validé (les invités ne sont pas comptés)."
    : "Aucun match validé pour l'instant.";

  onClose(): void {
    this.dialogRef.close();
  }
}
