import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from '../../shared/button/button';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import { toTournamentLeaderboard } from 'src/app/utils/leaderboard.util';

export interface RankData {
  tournamentName: string;
  teamId: string;
  scoreCalculation: ScoreCalculation;
  ranking: GlobalRankingEntry[];
  closeLabel?: string;
}

@Component({
  selector: 'app-rank-popup',
  standalone: true,
  imports: [Button, Leaderboard],
  templateUrl: './rank-popup.html',
  styleUrl: './rank-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankPopupComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<RankData>(DIALOG_DATA);
  readonly table = toTournamentLeaderboard(this.data.ranking, this.data.scoreCalculation);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
