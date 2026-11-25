import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { BracketChips } from 'src/app/shared/bracket-chips/bracket-chips';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { PlanTable } from 'src/app/shared/plan-table/plan-table';

/** One cards row holds this many brackets: six brackets make two rows. */
const BRACKETS_PER_ROW = 3;

/**
 * What a tournament with exactly the planned team count will be: its brackets, the number of
 * rounds and plates, and its round by round table (folded until asked for).
 */
@Component({
  selector: 'app-start-summary',
  imports: [BracketChips, Button, Icon, PlanTable],
  templateUrl: './start-summary.html',
  styleUrl: './start-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartSummary {
  public readonly plan = input.required<TournamentPlan>();

  protected readonly bracketsPerRow = BRACKETS_PER_ROW;
  protected readonly routeOpen = signal(false);

  protected readonly headline = computed(() => `${this.plan().teamCount} équipes, comme prévu`);
  protected readonly roundsLabel = computed(() => (this.plan().totalRounds > 1 ? 'tours' : 'tour'));
  protected readonly platesLabel = computed(() =>
    this.plan().maxPlates > 1 ? 'plaques' : 'plaque',
  );
  protected readonly routeToggleLabel = computed(() =>
    this.routeOpen() ? 'Masquer le parcours' : 'Voir le parcours tour par tour',
  );

  protected toggleRoute(): void {
    this.routeOpen.update((open) => !open);
  }
}
