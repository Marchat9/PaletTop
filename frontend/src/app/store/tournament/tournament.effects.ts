import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TeamService } from 'src/app/services/team.service';
import { TournamentService } from 'src/app/services/tournament.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  addNotification,
  removeLocalStorageData,
  setLocalStorageData,
} from '../app-config/app-config.actions';
import {
  STORAGE_TOURNAMENT_CODE_KEY,
  STORAGE_TOURNAMENT_PASSWORD_KEY,
} from '../app-config/app-config.effects';
import { resetRankingTournament } from '../ranking/ranking.actions';
import {
  createTournament,
  createTournamentFailure,
  createTournamentSuccess,
  disconnectTournamentAdministrator,
  loadTournamentInformation,
  loadTournamentInformationFailure,
  loadTournamentInformationSuccess,
  resetTournament,
} from './tournament.actions';
import {
  connectTournamentAdministrator,
  connectTournamentAdministratorFailure,
  connectTournamentAdministratorSuccess,
  removeTournamentAdministratorTeam,
  removeTournamentAdministratorTeamFailure,
  removeTournamentAdministratorTeamSuccess,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorConfigurationFailure,
  updateTournamentAdministratorConfigurationSuccess,
  updateTournamentAdministratorSingleTeam,
  updateTournamentAdministratorSingleTeamFailure,
  updateTournamentAdministratorSingleTeamSuccess,
  updateTournamentAdministratorTeam,
  updateTournamentAdministratorTeamFailure,
  updateTournamentAdministratorTeamSuccess,
} from './tournament.admin.actions';
import {
  completeTournament,
  completeTournamentFailure,
  completeTournamentSuccess,
  nextSession,
  nextSessionFailure,
  nextSessionSuccess,
  startTournament,
  startTournamentFailure,
  startTournamentSuccess,
} from './tournament.match.actions';
import { selectCurrentTournamentAdminInformations } from './tournament.selectors';

@Injectable()
export class TournamentEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly tournamentService = inject(TournamentService);
  private readonly teamService = inject(TeamService);

  getTournamentInformations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformation),
      switchMap(({ tournamentCode, teamCode }) =>
        this.tournamentService.joinTournamentAsPlayer(tournamentCode, teamCode).pipe(
          switchMap((tournament) => of(loadTournamentInformationSuccess({ tournament, teamCode }))),
          catchError((error) =>
            of(loadTournamentInformationFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  createTournament$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createTournament),
      switchMap(({ configuration }) =>
        this.tournamentService.createTournament(configuration).pipe(
          switchMap((tournament) =>
            of(
              createTournamentSuccess({ tournament, password: configuration.adminPassword }),
              setLocalStorageData({ key: STORAGE_TOURNAMENT_CODE_KEY, value: configuration.code }),
              setLocalStorageData({
                key: STORAGE_TOURNAMENT_PASSWORD_KEY,
                value: configuration.adminPassword,
              }),
            ),
          ),
          catchError((error) =>
            of(createTournamentFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  connectTournamentAdministrator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectTournamentAdministrator),
      switchMap(({ code, password }) =>
        this.tournamentService.getAdminTournament(code, password).pipe(
          switchMap((tournament) =>
            of(
              connectTournamentAdministratorSuccess({ tournament }),
              setLocalStorageData({ key: STORAGE_TOURNAMENT_CODE_KEY, value: code }),
              setLocalStorageData({ key: STORAGE_TOURNAMENT_PASSWORD_KEY, value: password }),
            ),
          ),
          catchError((error) =>
            of(connectTournamentAdministratorFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  updateTournamentConfiguration$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTournamentAdministratorConfiguration),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ idtournament, tournament }, adminInformation]) =>
        this.tournamentService
          .updateTournamentConfiguration(idtournament, tournament, adminInformation?.password ?? '')
          .pipe(
            switchMap((tournament) => {
              const actions: Action[] = [
                updateTournamentAdministratorConfigurationSuccess({ tournament }),
                addNotification({
                  notification: {
                    id: crypto.randomUUID(),
                    message: 'Modification de la configuration du tournoi réussi.',
                    typeIcon: 'success',
                    type: 'Configuration de tournoi',
                    createdAt: Date.now(),
                  },
                }),
              ];

              const currentCode = localStorage.getItem(STORAGE_TOURNAMENT_CODE_KEY);
              if (tournament.code !== (currentCode ?? '')) {
                actions.push(
                  setLocalStorageData({ key: STORAGE_TOURNAMENT_CODE_KEY, value: tournament.code }),
                );
              }

              return of(...actions);
            }),
            catchError((error) =>
              of(
                updateTournamentAdministratorConfigurationFailure({
                  error: convertErrorToString(error),
                }),
              ),
            ),
          ),
      ),
    ),
  );

  updateTournamentTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTournamentAdministratorTeam),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ code, teams }, adminInformation]) =>
        this.tournamentService
          .addTeamsToTournament(code, teams, adminInformation?.password ?? '')
          .pipe(
            switchMap((tournament) => of(updateTournamentAdministratorTeamSuccess({ tournament }))),
            catchError((error) =>
              of(updateTournamentAdministratorTeamFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  updateSingleTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTournamentAdministratorSingleTeam),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ tournamentCode, teamCode, teamId, teamData }, adminInformation]) =>
        this.teamService
          .updateTeam(tournamentCode, teamCode, {
            code: tournamentCode,
            password: adminInformation?.password ?? '',
            teamId,
            teamData,
          })
          .pipe(
            switchMap((team) => of(updateTournamentAdministratorSingleTeamSuccess({ team }))),
            catchError((error) =>
              of(
                updateTournamentAdministratorSingleTeamFailure({
                  error: convertErrorToString(error),
                }),
              ),
            ),
          ),
      ),
    ),
  );

  removeTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeTournamentAdministratorTeam),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ tournamentCode, teamCode, teamId }, adminInformation]) =>
        this.teamService
          .deleteTeam(tournamentCode, teamCode, {
            code: tournamentCode,
            password: adminInformation?.password ?? '',
            teamId,
          })
          .pipe(
            switchMap(() => of(removeTournamentAdministratorTeamSuccess({ teamId }))),
            catchError((error) =>
              of(
                removeTournamentAdministratorTeamFailure({
                  error: convertErrorToString(error),
                }),
              ),
            ),
          ),
      ),
    ),
  );

  startTournament$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startTournament),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([, adminInfo]) =>
        this.tournamentService.startTournament(adminInfo!.code, adminInfo!.password).pipe(
          switchMap((tournament) => of(startTournamentSuccess({ tournament }))),
          catchError((error) => of(startTournamentFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  nextSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(nextSession),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([, adminInfo]) =>
        this.tournamentService.nextSession(adminInfo!.code, adminInfo!.password).pipe(
          switchMap((tournament) => of(nextSessionSuccess({ tournament }))),
          catchError((error) => of(nextSessionFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  completeTournament$ = createEffect(() =>
    this.actions$.pipe(
      ofType(completeTournament),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([, adminInfo]) =>
        this.tournamentService.completeTournament(adminInfo!.code, adminInfo!.password).pipe(
          switchMap((tournament) => of(completeTournamentSuccess({ tournament }))),
          catchError((error) =>
            of(completeTournamentFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  disconnectTournamentAdministrator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(disconnectTournamentAdministrator, createTournament),
      switchMap(() =>
        of(
          resetTournament(),
          resetRankingTournament(),
          removeLocalStorageData({ key: STORAGE_TOURNAMENT_CODE_KEY }),
          removeLocalStorageData({ key: STORAGE_TOURNAMENT_PASSWORD_KEY }),
        ),
      ),
    ),
  );

  tournamentActionErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        startTournamentFailure,
        nextSessionFailure,
        completeTournamentFailure,
        updateTournamentAdministratorTeamFailure,
        updateTournamentAdministratorConfigurationFailure,
        updateTournamentAdministratorSingleTeamFailure,
        removeTournamentAdministratorTeamFailure,
      ),
      map(({ error }) =>
        addNotification({
          notification: {
            id: crypto.randomUUID(),
            message: error,
            typeIcon: 'error',
            type: 'error',
            createdAt: Date.now(),
          },
        }),
      ),
    ),
  );
}
