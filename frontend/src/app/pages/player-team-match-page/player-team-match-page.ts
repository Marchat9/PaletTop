import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { RankData, RankPopupComponent } from 'src/app/modales/rank-popup/rank-popup';
import { ValidateMatch } from 'src/app/models/match-validate-score.model';
import { SessionStatus } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TeamScoreUpdate } from 'src/app/models/score-update.model';
import { StartMatch } from 'src/app/models/start-match.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { historyToResults } from 'src/app/pages/player-team-match-page/player-team-match-page.utils';
import { Icon } from 'src/app/shared/icon/icon';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { selectMatchHistory } from 'src/app/store/match-history/match-history.selectors';
import { startMatch, updateScore, validateMatch } from 'src/app/store/match/match.actions';
import {
  selectCurrentMatch,
  selectStartMatchError,
  selectStartMatchLoading,
  selectUpdateScoreError,
  selectValidateMatchError,
  selectValidateMatchLoading,
} from 'src/app/store/match/match.selectors';
import { selectRanking } from 'src/app/store/ranking/ranking.selectors';
import { loadSessions } from 'src/app/store/session/session.actions';
import { selectSessions } from 'src/app/store/session/session.selectors';
import {
  selectTeamData,
  selectTeamError,
  selectTeamIsLoading,
} from 'src/app/store/team/team.selectors';
import { loadTournamentInformation } from 'src/app/store/tournament/tournament.actions';
import {
  selectCurrentTournament,
  selectCurrentTournamentData,
} from 'src/app/store/tournament/tournament.selectors';
import { PlayerMatchCardComponent } from './player-match-card/player-match-card';
import { PlayerMatchResultsComponent } from './player-match-results/player-match-results';
import { PlayerTeamHeaderComponent } from './player-team-header/player-team-header';
import { PlayerTeamMembersComponent } from './player-team-members/player-team-members';

export type TeamMatchStatus = 'NOT_STARTED' | 'CANCELLED' | 'FINISH';

@Component({
  selector: 'app-player-team-match-page',
  standalone: true,
  imports: [
    PlayerTeamHeaderComponent,
    PlayerTeamMembersComponent,
    PlayerMatchResultsComponent,
    PlayerMatchCardComponent,
    Icon,
  ],
  templateUrl: './player-team-match-page.html',
  styleUrl: './player-team-match-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTeamMatchPageComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  private readonly teamCode = this.route.snapshot.paramMap.get('teamCode');
  private readonly tournamentPathCode = this.route.snapshot.paramMap.get('tournamentCode');

  private readonly tournamentState = this.store.selectSignal(selectCurrentTournament);
  private readonly tournamentData = this.store.selectSignal(selectCurrentTournamentData);
  private readonly ranking = this.store.selectSignal(selectRanking);
  private readonly matchHistory = this.store.selectSignal(selectMatchHistory);
  public readonly team = this.store.selectSignal(selectTeamData);
  private readonly match = this.store.selectSignal(selectCurrentMatch);
  private readonly sessions = this.store.selectSignal(selectSessions);

  // Loading
  public readonly teamIsLoading = this.store.selectSignal(selectTeamIsLoading);
  public readonly startMatchLoading = this.store.selectSignal(selectStartMatchLoading);
  public readonly validateMatchLoading = this.store.selectSignal(selectValidateMatchLoading);

  // Error
  public readonly startMatchError = this.store.selectSignal(selectStartMatchError);
  public readonly validateMatchError = this.store.selectSignal(selectValidateMatchError);
  public readonly updateScoreError = this.store.selectSignal(selectUpdateScoreError);
  public readonly teamError = this.store.selectSignal(selectTeamError);
  public readonly error = computed(() => this.tournamentState().error ?? this.teamError());

  // Data
  public readonly currentSession = computed(() =>
    this.sessions()?.find((session) => session.status === SessionStatus.OPEN),
  );
  public readonly currentMatch: Signal<Nullable<PlayerMatchDto>> = computed(() =>
    this.currentSession()?.matches.some((match) => match.id === this.match()?.id)
      ? this.match()
      : null,
  );
  public readonly teamMatchStatus: Signal<Nullable<TeamMatchStatus>> = computed(() => {
    const teamId = this.team()?.id;

    const isDraft = this.tournamentData()?.status === TournamentStatus.DRAFT;
    const isCancelled = this.tournamentData()?.status === TournamentStatus.CANCELLED;
    const isFinishedForTeam = !this.currentSession()?.matches.some(
      (match) => match.teamA.id === teamId || match.teamB?.id === teamId,
    );
    switch (true) {
      case isDraft:
        return 'NOT_STARTED';
      case isCancelled:
        return 'CANCELLED';
      case isFinishedForTeam:
        return 'FINISH';
      default:
        return null;
    }
  });
  public readonly recentResults = computed(() => historyToResults(this.matchHistory()));
  public readonly isLoading = computed(
    () => this.tournamentState().isLoading || this.teamIsLoading(),
  );
  public readonly tournamentCode = computed(() => this.tournamentData()?.code ?? '—');
  public readonly pointsPerGame = computed(() =>
    Number(this.tournamentData()?.configuration.pointsPerGame ?? 13),
  );

  public readonly wins = computed(() => {
    const team = this.team();
    if (!team) return '—';
    const entry = this.ranking()?.find((r) => r.teamId === team.id);
    return entry ? `${entry.wins} / ${entry.matchesPlayed}` : '—';
  });

  public readonly nbTeams = computed(() => this.ranking().length);
  public readonly rank = computed(() => {
    const team = this.team();
    if (!team) return '—';
    const entry = this.ranking()?.find((r) => r.teamId === team.id);
    return entry ? String(entry.rank) : '—';
  });

  constructor() {
    effect(() => {
      if (this.tournamentPathCode?.length === 0 || this.teamCode?.length !== 4) {
        this.router.navigate(['/player']);
        return;
      }

      if (
        !this.tournamentState().data &&
        !this.tournamentState().isLoading &&
        !this.tournamentState().error
      ) {
        this.store.dispatch(
          loadTournamentInformation({
            tournamentCode: this.tournamentPathCode!,
            teamCode: this.teamCode!,
          }),
        );
      }

      if (!this.sessions() || this.sessions()?.length === 0) {
        this.store.dispatch(loadSessions({ code: this.tournamentPathCode! }));
      }
    });
  }

  public startMatch(matchInfo: StartMatch): void {
    this.store.dispatch(startMatch(matchInfo));
  }

  public updateScore(updatedScore: TeamScoreUpdate): void {
    this.store.dispatch(updateScore(updatedScore));
  }

  public validateMatch(validatedMatch: ValidateMatch): void {
    this.store.dispatch(validateMatch(validatedMatch));
  }

  public openRankModale(): void {
    const team = this.team();
    const tournamentName = this.tournamentData()?.name;
    const scoreCalculation = this.tournamentData()?.configuration?.scoreCalculation;
    if (!team || !scoreCalculation || !tournamentName) {
      this.store.dispatch(
        addNotification({
          notification: {
            id: crypto.randomUUID(),
            message: "Impossible d'afficher le classement.",
            typeIcon: 'error',
            type: 'classement',
            createdAt: Date.now(),
          },
        }),
      );
      return;
    }

    const data: RankData = {
      tournamentName,
      teamId: team.id,
      scoreCalculation,
      ranking: this.ranking(),
    };

    this.dialog.open<boolean, RankData>(RankPopupComponent, {
      data,
      panelClass: 'dialog-panel-large',
      backdropClass: 'dialog-backdrop-light',
      disableClose: false,
    });
  }
}
