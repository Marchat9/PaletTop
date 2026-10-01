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
import { SessionStatus } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
  historyToResults,
  toPlayerMatchView,
} from 'src/app/pages/player-team-match-page/player-team-match-page.utils';
import { PlayerByeCopy, PlayerValidationCopy } from 'src/app/models/player-match-view.model';
import { PlayerMatchCard } from 'src/app/shared/player-match-card/player-match-card';
import { PlayerMatchHistory } from 'src/app/shared/player-match-history/player-match-history';
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
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import { PlayerTeamHeaderComponent } from './player-team-header/player-team-header';
import { PlayerTeamMembersComponent } from './player-team-members/player-team-members';
import { newId } from 'src/app/utils/unique-id.util';

export type TeamMatchStatus = 'NOT_STARTED' | 'CANCELLED' | 'FINISH';

@Component({
  selector: 'app-player-team-match-page',
  standalone: true,
  imports: [
    PlayerTeamHeaderComponent,
    PlayerTeamMembersComponent,
    PlayerMatchHistory,
    PlayerMatchCard,
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

  /** Projection towards the shared card: it knows neither team nor tournament. */
  /**
   * The title announces what the card shows. A finished tournament shows no match but a closing
   * block that stands on its own: the title disappears rather than announcing a match that is not
   * there.
   */
  public readonly matchTitle = computed(() => {
    if (this.matchView()?.isBye) {
      return 'Au repos ce round';
    }
    return this.matchView() ? 'Match en cours' : null;
  });

  public readonly matchView = computed(() => {
    const match = this.currentMatch();
    const teamId = this.team()?.id;
    return match && teamId ? toPlayerMatchView(match, teamId) : null;
  });

  public readonly byeCopy = computed<PlayerByeCopy>(() => ({
    title: 'Exempté',
    message: 'Votre équipe est exemptée pour ce round.',
    awardLabel: `Victoire accordée · +${this.currentMatch()?.scoreA ?? 0} pts`,
    pendingLabel: 'En attente de confirmation',
  }));

  public readonly validationCopy: PlayerValidationCopy = {
    hint: 'Pour valider le score, demandez le code équipe de votre adversaire.',
    placeholder: 'Code équipe adverse',
  };

  public readonly rankLabel = computed(() => {
    const value = Number(this.rank());
    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }
    return `${value}${value === 1 ? 'er' : 'ème'}`;
  });
  public readonly isLoading = computed(
    () =>
      !this.tournamentState().data && (this.tournamentState().isLoading || this.teamIsLoading()),
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
        this.router.navigate(['/player/tournament']);
        return;
      }
      const isActive = this.tournamentData()?.status === TournamentStatus.ACTIVE;

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

      if (isActive && (!this.sessions() || this.sessions()?.length === 0)) {
        this.store.dispatch(loadSessions({ code: this.tournamentPathCode! }));
      }
    });

    onResyncRequested(() => {
      if (!this.tournamentPathCode || !this.teamCode) return;
      this.store.dispatch(
        loadTournamentInformation({
          tournamentCode: this.tournamentPathCode,
          teamCode: this.teamCode,
        }),
      );
      this.store.dispatch(loadSessions({ code: this.tournamentPathCode }));
    });
  }

  public startMatch(): void {
    const matchId = this.currentMatch()?.id;
    const teamCode = this.team()?.code;
    if (!matchId || !teamCode) {
      return;
    }
    this.store.dispatch(startMatch({ matchId, teamCode }));
  }

  public updateScore(scores: { myScore: number; opponentScore: number }): void {
    const match = this.currentMatch();
    const teamCode = this.team()?.code;
    if (!match || !teamCode) {
      return;
    }

    const iAmTeamA = match.teamA.id === this.team()?.id;
    this.store.dispatch(
      updateScore({
        matchId: match.id,
        teamCode,
        scoreA: iAmTeamA ? scores.myScore : scores.opponentScore,
        scoreB: iAmTeamA ? scores.opponentScore : scores.myScore,
      }),
    );
  }

  public validateMatch(opponentTeamCode: string): void {
    const matchId = this.currentMatch()?.id;
    const teamCode = this.team()?.code;
    if (!matchId || !teamCode) {
      return;
    }
    this.store.dispatch(validateMatch({ matchId, teamCode, opponentTeamCode }));
  }

  public openRankModale(): void {
    const team = this.team();
    const tournamentName = this.tournamentData()?.name;
    const scoreCalculation = this.tournamentData()?.configuration?.scoreCalculation;
    if (!team || !scoreCalculation || !tournamentName) {
      this.store.dispatch(
        addNotification({
          notification: {
            id: newId(),
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
