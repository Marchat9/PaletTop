import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ClubLeaderboardTable } from 'src/app/shared/club-leaderboard-table/club-leaderboard-table';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';
import {
  selectTrainingClubLeaderboard,
  selectTrainingClubLeaderboardError,
  selectTrainingClubLeaderboardIsLoading,
} from 'src/app/store/training/training.selectors';

export interface ClubLeaderboardPopupData {
  /** Club member reading the leaderboard, marked « vous » (null: nobody). */
  myMemberId: Nullable<string>;
}

/** Club leaderboard, opened from the session leaderboard (the page loads it before opening). */
@Component({
  selector: 'app-club-leaderboard-popup',
  imports: [ClubLeaderboardTable, Icon],
  templateUrl: './club-leaderboard-popup.html',
  styleUrl: './club-leaderboard-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubLeaderboardPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<Nullable<ClubLeaderboardPopupData>>(DIALOG_DATA, {
    optional: true,
  });

  readonly myMemberId = this.data?.myMemberId ?? null;

  readonly entries = this.store.selectSignal(selectTrainingClubLeaderboard);
  readonly isLoading = this.store.selectSignal(selectTrainingClubLeaderboardIsLoading);
  readonly error = this.store.selectSignal(selectTrainingClubLeaderboardError);

  onClose(): void {
    this.dialogRef.close();
  }
}
