import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { StartSummary } from 'src/app/shared/start-summary/start-summary';

export interface StartSummaryPopupData {
  /** The plan of the registered teams, which are as many as planned. */
  plan: TournamentPlan;
  /** Narrow screen: a bottom sheet instead of a centred dialog. */
  mobile: boolean;
  /** Why the summary is shown again (the teams moved since the last check); null the first time. */
  notice: Nullable<string>;
}

/** Opens the summary of the start; it closes with true once the admin confirmed. */
export function openStartSummaryPopup(
  dialog: Dialog,
  overlay: Overlay,
  data: StartSummaryPopupData,
): DialogRef<boolean | undefined> {
  return dialog.open<boolean | undefined, StartSummaryPopupData>(StartSummaryPopup, {
    data,
    ...(data.mobile
      ? {
          positionStrategy: overlay.position().global().bottom('0').width('100%'),
          panelClass: 'popup-sheet-panel',
        }
      : { panelClass: 'start-summary-panel' }),
    backdropClass: 'dialog-backdrop-light',
    disableClose: false,
  });
}

/**
 * « Démarrer le tournoi » of a structured tournament with exactly the planned count: the usual
 * confirmation, with what the tournament will be. A bottom sheet on mobile.
 */
@Component({
  selector: 'app-start-summary-popup',
  imports: [Button, Icon, InlineNotice, StartSummary],
  templateUrl: './start-summary-popup.html',
  styleUrl: './start-summary-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartSummaryPopup {
  private readonly dialogRef = inject<DialogRef<boolean | undefined>>(DialogRef);
  protected readonly data = inject<StartSummaryPopupData>(DIALOG_DATA);

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}
