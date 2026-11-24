import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { PlanOption, PlanOptionId, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { BracketChips } from 'src/app/shared/bracket-chips/bracket-chips';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { LaunchCheck } from 'src/app/shared/launch-check/launch-check';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';
import { hasLowFill, isPlanPossible } from 'src/app/utils/launch-check.util';

/** The page owns the plan and what the start sends: the popup only reports the option picked. */
export interface LaunchCheckPopupData {
  /** A plan with launch options: the registered teams differ from the planned count. */
  plan: TournamentPlan;
  registeredCount: number;
  targetCount: number;
  /** Narrow screen: a full-screen dialog, and the route of an option in a second bottom sheet. */
  mobile: boolean;
  /** Why the check is shown again (the teams moved since the last one); null the first time. */
  notice: Nullable<string>;
}

/** What the launch check closes with: the option to start with, or a detour to the configuration. */
export type LaunchCheckResult = PlanOptionId | typeof EDIT_CONFIGURATION;
export const EDIT_CONFIGURATION = 'edit-configuration';

/** Opens the launch check; it closes with its result, or nothing when cancelled. */
export function openLaunchCheckPopup(
  dialog: Dialog,
  data: LaunchCheckPopupData,
): DialogRef<LaunchCheckResult | undefined> {
  return dialog.open<LaunchCheckResult | undefined, LaunchCheckPopupData>(LaunchCheckPopup, {
    data,
    panelClass: data.mobile ? 'launch-check-fullscreen-panel' : 'launch-check-panel',
    backdropClass: 'dialog-backdrop-light',
    disableClose: false,
  });
}

/**
 * Launch check of a structured tournament whose team count differs from the plan: a modal on
 * desktop, a full-screen dialog on mobile (the route of an option opens over it, from the bottom).
 */
@Component({
  selector: 'app-launch-check-popup',
  imports: [BracketChips, Button, Icon, InlineNotice, LaunchCheck, PlanTable],
  templateUrl: './launch-check-popup.html',
  styleUrl: './launch-check-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchCheckPopup {
  private readonly dialogRef = inject<DialogRef<LaunchCheckResult | undefined>>(DialogRef);
  protected readonly data = inject<LaunchCheckPopupData>(DIALOG_DATA);

  protected readonly selectedOptionId = signal<Nullable<PlanOptionId>>(null);
  /** Mobile only: the option whose route is open over the dialog. */
  protected readonly viewedOptionId = signal<Nullable<PlanOptionId>>(null);
  protected readonly lowFillConfirmed = signal(false);

  protected readonly launchLabel = this.data.mobile ? 'Lancer' : 'Lancer avec cette configuration';

  protected readonly viewedOption = computed(() => this.optionOf(this.viewedOptionId()));

  /**
   * Nothing starts before a choice, an impossible plan never starts, and a nearly empty bracket
   * asks for one more confirmation.
   */
  protected readonly canLaunch = computed(() => {
    const option = this.optionOf(this.selectedOptionId());
    return (
      !!option &&
      isPlanPossible(option.plan) &&
      (!hasLowFill(option.plan) || this.lowFillConfirmed())
    );
  });

  protected select(optionId: PlanOptionId): void {
    this.selectedOptionId.set(optionId);
    this.lowFillConfirmed.set(false);
  }

  protected view(optionId: PlanOptionId): void {
    this.viewedOptionId.set(optionId);
  }

  protected closeView(): void {
    this.viewedOptionId.set(null);
  }

  protected chooseViewedOption(): void {
    const optionId = this.viewedOptionId();
    if (optionId) {
      this.select(optionId);
    }
    this.closeView();
  }

  protected launch(): void {
    const optionId = this.selectedOptionId();
    if (optionId && this.canLaunch()) {
      this.dialogRef.close(optionId);
    }
  }

  protected editConfiguration(): void {
    this.dialogRef.close(EDIT_CONFIGURATION);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private optionOf(optionId: Nullable<PlanOptionId>): Nullable<PlanOption> {
    return this.data.plan.options.find((option) => option.id === optionId) ?? null;
  }
}
