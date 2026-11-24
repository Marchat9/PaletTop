import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';

/**
 * The parcours of a structured tournament, round by round: the plan frozen at launch (or planned
 * with the registered teams in draft), the finished rounds ticked and the current one highlighted.
 * Round numbers are those of `PlanRound.number`, qualifying rounds included.
 */
@Component({
  selector: 'app-tournament-parcours',
  imports: [CardCollapsible, Icon, PlanTable],
  templateUrl: './tournament-parcours.html',
  styleUrl: './tournament-parcours.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentParcours {
  public readonly plan = input.required<Omit<TournamentPlan, 'options'>>();
  /** Number of the last finished round. */
  public readonly doneRounds = input<number>(0);
  /** Number of the round being played. */
  public readonly currentRound = input<number | null>(null);
  public readonly expanded = input<boolean>(true);

  protected readonly summary = computed(() => {
    const { totalRounds, maxPlates } = this.plan();
    return `${totalRounds} ${totalRounds > 1 ? 'tours' : 'tour'} · ${maxPlates} ${maxPlates > 1 ? 'plaques' : 'plaque'}`;
  });
}
