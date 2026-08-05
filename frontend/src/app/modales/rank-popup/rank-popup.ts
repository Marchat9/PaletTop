import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from '../../shared/button/button';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { RankingCard } from 'src/app/shared/ranking-card/ranking-card';

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
  imports: [Button, RankingCard],
  templateUrl: './rank-popup.html',
  styleUrl: './rank-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankPopupComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<RankData>(DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
