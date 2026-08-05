import { Dialog } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '@environment';
import { Store } from '@ngrx/store';
import {
  ConfirmationData,
  ConfirmationPopupComponent,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { RankingCard } from 'src/app/shared/ranking-card/ranking-card';
import { TournamentConfigurationField } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { adminUpdateScore } from 'src/app/store/match/match.actions';
import { selectRanking, selectRankingIsLoading } from 'src/app/store/ranking/ranking.selectors';
import { disconnectTournamentAdministrator } from 'src/app/store/tournament/tournament.actions';
import {
  connectTournamentAdministrator,
  removeTournamentAdministratorTeam,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorSingleTeam,
  updateTournamentAdministratorTeam,
} from 'src/app/store/tournament/tournament.admin.actions';
import {
  completeTournament,
  nextSession,
  startTournament,
} from 'src/app/store/tournament/tournament.match.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  selectCompleteTournamentLoading,
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentIsLoading,
  selectNextSessionLoading,
  selectStartTournamentLoading,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { MatchSessionsCardComponent } from './components/match-sessions-card/match-sessions-card';
import { TournamentConfigurationCardComponent } from './components/tournament-configuration-card/tournament-configuration-card.component';
import { TournamentHeaderComponent } from './components/tournament-header/tournament-header.component';
import { TournamentTeamConfigurationCard } from './components/tournament-team-configuration-card/tournament-team-configuration-card';
import { selectSessions } from 'src/app/store/session/session.selectors';
import { selectAdminUpdateScoreLoading } from 'src/app/store/match/match.selectors';

@Component({
  selector: 'app-admin-tournament-page',
  standalone: true,
  imports: [
    CommonModule,
    TournamentHeaderComponent,
    TournamentConfigurationCardComponent,
    TournamentTeamConfigurationCard,
    MatchSessionsCardComponent,
    RankingCard,
  ],
  templateUrl: './admin-tournament-page.component.html',
  styleUrl: './admin-tournament-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTournamentPageComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  readonly tournamentCode = signal<string | null>(null);

  // Selects
  private readonly tournamentData = this.store.selectSignal(selectCurrentTournamentData);
  private readonly adminSession = this.store.selectSignal(selectCurrentTournamentAdminInformations);
  public readonly sessions = this.store.selectSignal(selectSessions);
  public readonly ranking = this.store.selectSignal(selectRanking);

  // Loadings
  public readonly tournamentLoading = this.store.selectSignal(selectCurrentTournamentIsLoading);
  public readonly completeLoading = this.store.selectSignal(selectCompleteTournamentLoading);
  public readonly isUpdateConfigLoading = this.store.selectSignal(
    selectTournamentUpdateConfigLoading,
  );
  public readonly startLoading = this.store.selectSignal(selectStartTournamentLoading);
  public readonly nextLoading = this.store.selectSignal(selectNextSessionLoading);
  public readonly scoreUpdateLoading = this.store.selectSignal(selectAdminUpdateScoreLoading);
  public readonly rankingLoading = this.store.selectSignal(selectRankingIsLoading);

  // Compute
  public readonly tournament = computed<Nullable<TournamentDto>>(() => this.tournamentData());
  public readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  public readonly isLoading = computed(() => this.tournamentLoading());

  // Data
  public readonly hiddenFields: TournamentConfigurationField[] = environment.tournamentConfiguration
    .admin.hiddenFields as TournamentConfigurationField[];
  public readonly readonlyFields: TournamentConfigurationField[] = environment
    .tournamentConfiguration.admin.readonlyFields as TournamentConfigurationField[];

  constructor() {
    // Try to connect when code / password change.
    effect(() => {
      const code = this.tournamentCode();
      const password = this.adminPassword();
      const currentTournamentCode = this.tournament()?.code;

      if (!code || !password || currentTournamentCode === code) {
        return;
      }

      this.store.dispatch(connectTournamentAdministrator({ code, password }));
    });

    // check if all required data are present or redirect to admin login page
    effect(() => {
      if (!this.tournament() && !this.isLoading()) {
        this.reconnectAsAdmin();
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      const code = params.get('tournamentCode');
      if (code) {
        this.tournamentCode.set(code);
      } else {
        this.reconnectAsAdmin();
      }
    });
  }

  // ========= Actions  =========

  public disconnect(): void {
    this.store.dispatch(disconnectTournamentAdministrator());
    this.router.navigate(['/home']);
  }
  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTournamentAdministrator());
    this.router.navigate(['/admin']);
  }

  public updateTournamentConfiguration(tournament: TournamentConfigurationDto): void {
    const id = this.tournament()?.id;
    if (!id) {
      console.debug('Cannot update tournament configuration: tournament is missing');
      return;
    }
    this.store.dispatch(
      updateTournamentAdministratorConfiguration({ idtournament: id, tournament }),
    );
  }

  public updateTournamentTeam(event: TeamConfigEvent): void {
    const code = this.tournament()?.code;
    if (!code) {
      console.debug('Cannot update tournament team: tournament code is missing');
      return;
    }
    switch (event.type) {
      case TeamConfigEventType.CREATE_TEAM:
        this.store.dispatch(updateTournamentAdministratorTeam({ code, teams: [event.payload] }));
        break;
      case TeamConfigEventType.IMPORT_TEAMS:
        this.store.dispatch(updateTournamentAdministratorTeam({ code, teams: event.payload }));
        break;
      case TeamConfigEventType.UPDATE_TEAM: {
        const team = this.tournament()?.teams.find((t) => t.id === event.payload.teamId);
        if (!team?.code) {
          console.debug('Cannot update team: team code is missing');
          return;
        }
        this.store.dispatch(
          updateTournamentAdministratorSingleTeam({
            tournamentCode: code,
            teamCode: team.code,
            teamId: event.payload.teamId,
            teamData: { name: event.payload.name, players: event.payload.players },
          }),
        );
        break;
      }
      case TeamConfigEventType.REMOVE_TEAM: {
        const team = this.tournament()?.teams.find((t) => t.id === event.payload.teamId);
        if (!team?.code) {
          console.debug('Cannot remove team: team code is missing');
          return;
        }
        const data: ConfirmationData = {
          title: "Supprimer l'équipe",
          message: `Cette action est irréversible. L'équipe "${team.name}" et ses joueurs seront définitivement supprimés.`,
          confirmLabel: 'Supprimer',
        };
        this.dialog
          .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
            data,
            panelClass: 'dialog-panel',
            backdropClass: 'dialog-backdrop-light',
            disableClose: false,
          })
          .closed.subscribe((confirmed) => {
            if (confirmed) {
              this.store.dispatch(
                removeTournamentAdministratorTeam({
                  tournamentCode: code,
                  teamCode: team.code!,
                  teamId: event.payload.teamId,
                }),
              );
            }
          });
        break;
      }
      default:
        console.warn('Unknown team config event:', event);
        break;
    }
  }

  public adminScoreUpdate(updatedScore: ScoreUpdate): void {
    this.store.dispatch(adminUpdateScore(updatedScore));
  }

  public onNotification(notification: Notification): void {
    this.store.dispatch(addNotification({ notification }));
  }

  public startTournament(): void {
    const data: ConfirmationData = {
      title: 'Démarrer le tournoi',
      message:
        'Cette action est irréversible. Les équipes seront réparties aléatoirement dans les poules et les matchs de la première session seront générés.',
      confirmLabel: 'Démarrer',
    };

    this.dialog
      .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
        data,
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(startTournament());
        }
      });
  }

  public nextSession(): void {
    this.store.dispatch(nextSession());
  }

  public completeTournament(): void {
    const data: ConfirmationData = {
      title: 'Terminer le tournoi',
      message:
        'Cette action est irréversible. Le tournoi sera clôturé et aucune nouvelle session ne pourra être démarrée.',
      confirmLabel: 'Terminer',
    };

    this.dialog
      .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
        data,
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(completeTournament());
        }
      });
  }
}
