import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { championshipStartBlocker } from 'src/app/utils/championship-start.util';

/** Below this, there is nobody to play against. */
export const MIN_TEAMS_TO_START = 2;

/**
 * What the admin of a draft tournament has to do next: register teams, then start. Shown only while
 * the tournament is a draft; once it has started, the rounds card takes over.
 */
@Component({
  selector: 'app-tournament-next-step',
  imports: [Card, Button, Icon],
  templateUrl: './tournament-next-step.html',
  styleUrl: './tournament-next-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentNextStep {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly startLoading = input<boolean>(false);

  public readonly addTeam = output<void>();
  public readonly startTournament = output<void>();
  // ==============================

  public readonly isDraft = computed(() => this.tournament()?.status === TournamentStatus.DRAFT);
  public readonly teamCount = computed(() => this.tournament()?.teams?.length ?? 0);
  public readonly capacity = computed(() => this.tournament()?.configuration.maxTeamCapacity ?? 0);
  public readonly isFull = computed(() => this.teamCount() >= this.capacity());

  /** Enough teams registered: the start becomes the current step. */
  public readonly teamsReady = computed(() => this.teamCount() >= MIN_TEAMS_TO_START);

  /** Why the start is refused even with enough teams (championship split), or null. */
  public readonly startBlocker = computed(() =>
    championshipStartBlocker(this.tournament() ?? null),
  );

  public readonly minTeamsToStart = MIN_TEAMS_TO_START;
}
