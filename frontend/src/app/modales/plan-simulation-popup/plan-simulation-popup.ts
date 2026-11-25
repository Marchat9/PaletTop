import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { Icon } from 'src/app/shared/icon/icon';
import { PlanSimulation } from 'src/app/shared/tournament-configuration/tournament-mode-parameter/structured-tournament/plan-simulation/plan-simulation';

/** The page owns the simulation: the popup only shows its signals and reports the slider. */
export interface PlanSimulationPopupData {
  targetCount: number;
  plan: Signal<TournamentPlan | null>;
  /** Null while the slider has not moved: the target is shown. */
  teamCount: Signal<Nullable<number>>;
  error: Signal<Nullable<string>>;
  changeTeamCount: (teamCount: number) => void;
}

/** Opens the simulation as a bottom sheet; the page calls it on narrow screens. */
export function openPlanSimulationSheet(
  dialog: Dialog,
  overlay: Overlay,
  data: PlanSimulationPopupData,
): void {
  dialog.open<void, PlanSimulationPopupData>(PlanSimulationPopup, {
    data,
    positionStrategy: overlay.position().global().bottom('0').width('100%'),
    panelClass: 'popup-sheet-panel',
    backdropClass: 'dialog-backdrop-light',
  });
}

/** Bottom sheet of the simulation, opened by the page on narrow screens. */
@Component({
  selector: 'app-plan-simulation-popup',
  imports: [Icon, PlanSimulation],
  templateUrl: './plan-simulation-popup.html',
  styleUrl: './plan-simulation-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanSimulationPopup {
  private readonly dialogRef = inject(DialogRef);
  protected readonly data = inject<PlanSimulationPopupData>(DIALOG_DATA);

  protected readonly teamCount = computed(() => this.data.teamCount() ?? this.data.targetCount);

  protected close(): void {
    this.dialogRef.close();
  }
}
