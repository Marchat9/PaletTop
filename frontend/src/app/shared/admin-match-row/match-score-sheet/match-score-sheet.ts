import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AdminMatchView } from 'src/app/models/admin-match.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { Button } from 'src/app/shared/button/button';
import { SwipeToDismissDirective } from 'src/app/shared/swipe-to-dismiss/swipe-to-dismiss.directive';
import { ScoreStepper } from '../score-stepper/score-stepper';

export interface MatchScoreSheetData {
  match: AdminMatchView;
  pointsPerGame: number;
}

/**
 * Mobile bottom sheet correcting one match score; closes with the update, or nothing on cancel
 * (button, backdrop or swiped down).
 */
@Component({
  selector: 'app-match-score-sheet',
  imports: [Button, ScoreStepper, SwipeToDismissDirective],
  templateUrl: './match-score-sheet.html',
  styleUrl: './match-score-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchScoreSheet {
  private readonly dialogRef = inject<DialogRef<ScoreUpdate>>(DialogRef);
  public readonly data = inject<MatchScoreSheetData>(DIALOG_DATA);

  public readonly match = this.data.match;
  public readonly draftScoreA = signal(this.match.scoreA);
  public readonly draftScoreB = signal(this.match.scoreB);
  public readonly hasChanges = computed(
    () => this.draftScoreA() !== this.match.scoreA || this.draftScoreB() !== this.match.scoreB,
  );

  public save(): void {
    this.dialogRef.close({
      matchId: this.match.id,
      scoreA: this.draftScoreA(),
      scoreB: this.draftScoreB(),
    });
  }

  public cancel(): void {
    this.dialogRef.close();
  }
}
