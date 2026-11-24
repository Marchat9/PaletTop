import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { PlanBracket, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { PlanMessage, pickPlanMessage } from 'src/app/utils/plan-message.util';
import { BracketChips } from 'src/app/shared/bracket-chips/bracket-chips';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { InputRange } from 'src/app/shared/input-range/input-range';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';

export const SIMULATION_MIN_TEAMS = 2;
export const SIMULATION_MAX_TEAMS = 256;

/** Cards reserved for the brackets (main + 3 consolations), so that nothing moves with the count. */
const RESERVED_CHIP_SLOTS = 4;

interface LegendItem {
  level: 'ok' | 'mid' | 'low';
  label: string;
}

/**
 * « Et si j'ai X équipes ? »: slider with one-team buttons, the brackets and the round by round table
 * of the simulated count. The pinned part (count, slider, chips, legend) keeps the same height
 * whatever the count; only the body (message and table) changes.
 */
@Component({
  selector: 'app-plan-simulation',
  imports: [BracketChips, Button, Icon, InlineNotice, InputRange, PlanTable],
  templateUrl: './plan-simulation.html',
  styleUrl: './plan-simulation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanSimulation {
  /** Plan of `teamCount`; null until the first answer. */
  public readonly plan = input.required<TournamentPlan | null>();
  /** « Nombre d'équipes cible ». */
  public readonly targetCount = input.required<number>();
  public readonly teamCount = input.required<number>();
  /** Why the plan could not be computed, shown in place of the message. */
  public readonly error = input<Nullable<string>>(null);
  /** Inside the bottom sheet: fills its height, only the body scrolls. */
  public readonly mobile = input<boolean>(false);

  public readonly teamCountChange = output<number>();

  protected readonly minTeams = SIMULATION_MIN_TEAMS;
  protected readonly maxTeams = SIMULATION_MAX_TEAMS;
  protected readonly chipSlots = RESERVED_CHIP_SLOTS;
  protected readonly legend: LegendItem[] = [
    { level: 'ok', label: 'Bien rempli' },
    { level: 'mid', label: 'À moitié' },
    { level: 'low', label: 'Peu rempli' },
  ];

  protected readonly brackets = computed<PlanBracket[]>(() => this.plan()?.brackets ?? []);
  protected readonly canDecrement = computed(() => this.teamCount() > SIMULATION_MIN_TEAMS);
  protected readonly canIncrement = computed(() => this.teamCount() < SIMULATION_MAX_TEAMS);
  protected readonly isOnTarget = computed(() => this.teamCount() === this.targetCount());
  protected readonly isSurplus = computed(() => this.teamCount() > this.targetCount());

  /** Always one line (never empty), so that the pinned part keeps its height. */
  protected readonly gapText = computed(() => {
    const gap = this.teamCount() - this.targetCount();
    if (gap === 0) {
      return 'Pile le nombre visé';
    }
    const count = Math.abs(gap);
    const teams = `${count} ${count > 1 ? 'équipes' : 'équipe'}`;
    return gap > 0
      ? `${teams} de plus que le nombre visé : une consolante en plus peut apparaître`
      : `${teams} de moins que le nombre visé`;
  });

  protected readonly message = computed<Nullable<PlanMessage>>(() => {
    const error = this.error();
    return error ? { tone: 'alert', icon: 'error', text: error } : pickPlanMessage(this.plan());
  });

  protected setTeamCount(count: number): void {
    const clamped = Math.min(SIMULATION_MAX_TEAMS, Math.max(SIMULATION_MIN_TEAMS, count));
    if (clamped !== this.teamCount()) {
      this.teamCountChange.emit(clamped);
    }
  }
}
