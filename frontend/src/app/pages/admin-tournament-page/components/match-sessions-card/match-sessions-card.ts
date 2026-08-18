import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { SessionMatchesComponent } from './session-matches/session-matches';
import { ScoreUpdate } from 'src/app/models/score-update.model';

@Component({
  selector: 'app-match-sessions-card',
  standalone: true,
  imports: [Button, CardCollapsible, SessionMatchesComponent, Icon],
  templateUrl: './match-sessions-card.html',
  styleUrl: './match-sessions-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchSessionsCardComponent {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly sessions = input<Nullable<MatchesSessionDto[]>>(null);
  public readonly startLoading = input<boolean>(false);
  public readonly nextLoading = input<boolean>(false);
  public readonly scoreUpdateLoading = input<boolean>(false);

  public readonly startTournament = output<void>();
  public readonly nextSession = output<void>();
  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================

  public readonly isDraft = computed(() => this.tournament()?.status === TournamentStatus.DRAFT);
  public readonly isActive = computed(() => this.tournament()?.status === TournamentStatus.ACTIVE);
  public readonly isFinished = computed(
    () => this.tournament()?.status === TournamentStatus.FINISHED,
  );
  public readonly isCancelled = computed(
    () => this.tournament()?.status === TournamentStatus.CANCELLED,
  );

  public readonly canGenerateNewSession = computed(
    () => this.tournament()?.tournamentStatus?.canGenerateNewSession ?? false,
  );

  public readonly currentSession = computed<Nullable<MatchesSessionDto>>(() => {
    const list = this.sessions();
    return !list?.length
      ? null
      : list.reduce((latest, s) => (s.sessionNumber > latest.sessionNumber ? s : latest));
  });
  public readonly sessionNumber = computed(() => this.currentSession()?.sessionNumber ?? 0);
  public readonly pointsPerGame = computed(() =>
    Number(this.tournament()?.configuration.pointsPerGame ?? 13),
  );
}
