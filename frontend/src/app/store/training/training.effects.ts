import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TrainingService } from 'src/app/services/training.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  addNotification,
  removeLocalStorageData,
  setLocalStorageData,
} from '../app-config/app-config.actions';
import {
  STORAGE_TRAINING_CODE_KEY,
  STORAGE_TRAINING_PASSWORD_KEY,
} from '../app-config/app-config.effects';
import {
  createTraining,
  createTrainingFailure,
  createTrainingSuccess,
  disconnectTrainingAdministrator,
  joinTrainingSession,
  joinTrainingSessionFailure,
  joinTrainingSessionSuccess,
  loadTrainingParticipantHistory,
  loadTrainingParticipantHistoryFailure,
  loadTrainingParticipantHistorySuccess,
  resetTraining,
} from './training.actions';
import {
  addTrainingMember,
  addTrainingMemberFailure,
  addTrainingMemberSuccess,
  connectTrainingAdministrator,
  connectTrainingAdministratorFailure,
  connectTrainingAdministratorSuccess,
  removeTrainingMember,
  removeTrainingMemberFailure,
  removeTrainingMemberSuccess,
  updateTrainingAdministratorInformations,
  updateTrainingAdministratorInformationsFailure,
  updateTrainingAdministratorInformationsSuccess,
} from './training.admin.actions';
import {
  checkinTrainingParticipant,
  checkinTrainingParticipantFailure,
  checkinTrainingParticipantSuccess,
  closeTrainingSession,
  closeTrainingSessionFailure,
  closeTrainingSessionSuccess,
  connectTrainingSessionAdministrator,
  connectTrainingSessionAdministratorFailure,
  connectTrainingSessionAdministratorSuccess,
  createTrainingSession,
  createTrainingSessionFailure,
  createTrainingSessionSuccess,
  loadTrainingLeaderboard,
  loadTrainingLeaderboardFailure,
  loadTrainingLeaderboardSuccess,
  loadTrainingSessionPublic,
  loadTrainingSessionPublicFailure,
  loadTrainingSessionPublicSuccess,
  loadTrainingSessions,
  loadTrainingSessionsFailure,
  loadTrainingSessionsSuccess,
  removeTrainingParticipant,
  removeTrainingParticipantFailure,
  removeTrainingParticipantSuccess,
} from './training.session.actions';
import {
  createTrainingTeam,
  createTrainingTeamFailure,
  createTrainingTeamSuccess,
  dissolveTrainingTeam,
  dissolveTrainingTeamFailure,
  dissolveTrainingTeamSuccess,
} from './training.team.actions';
import {
  generateTrainingRound,
  generateTrainingRoundFailure,
  generateTrainingRoundSuccess,
  loadTrainingRound,
  loadTrainingRoundFailure,
  loadTrainingRoundSuccess,
  loadTrainingRounds,
  loadTrainingRoundsFailure,
  loadTrainingRoundsSuccess,
} from './training.round.actions';
import {
  adminUpdateTrainingScore,
  adminUpdateTrainingScoreFailure,
  adminUpdateTrainingScoreSuccess,
  startTrainingMatch,
  startTrainingMatchFailure,
  startTrainingMatchSuccess,
  updateTrainingScore,
  updateTrainingScoreFailure,
  updateTrainingScoreSuccess,
  validateTrainingMatch,
  validateTrainingMatchFailure,
  validateTrainingMatchSuccess,
} from './training.match.actions';
import { selectCurrentTrainingAdminInformations } from './training.selectors';

@Injectable()
export class TrainingEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly trainingService = inject(TrainingService);

  // ---------------- Training creation / player join ----------------

  createTraining$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createTraining),
      switchMap(({ code, name, club, adminPassword }) =>
        this.trainingService.createTraining(code, name, club, adminPassword).pipe(
          switchMap((training) =>
            of(
              createTrainingSuccess({ training, password: adminPassword }),
              setLocalStorageData({ key: STORAGE_TRAINING_CODE_KEY, value: training.code }),
              setLocalStorageData({ key: STORAGE_TRAINING_PASSWORD_KEY, value: adminPassword }),
            ),
          ),
          catchError((error) => of(createTrainingFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  joinTrainingSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(joinTrainingSession),
      switchMap(({ sessionCode, participantCode }) =>
        this.trainingService.getCurrentMatch(sessionCode, participantCode).pipe(
          switchMap((currentMatch) =>
            of(joinTrainingSessionSuccess({ sessionCode, participantCode, currentMatch })),
          ),
          catchError((error) =>
            of(joinTrainingSessionFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  loadTrainingParticipantHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingParticipantHistory),
      switchMap(({ sessionCode, participantCode }) =>
        this.trainingService.getHistory(sessionCode, participantCode).pipe(
          switchMap((history) => of(loadTrainingParticipantHistorySuccess({ history }))),
          catchError((error) =>
            of(loadTrainingParticipantHistoryFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // ---------------- Training administrator (roster) ----------------

  connectTrainingAdministrator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectTrainingAdministrator),
      switchMap(({ code, password }) =>
        this.trainingService.getAdminTraining(code, password).pipe(
          switchMap((training) =>
            of(
              connectTrainingAdministratorSuccess({ training }),
              setLocalStorageData({ key: STORAGE_TRAINING_CODE_KEY, value: code }),
              setLocalStorageData({ key: STORAGE_TRAINING_PASSWORD_KEY, value: password }),
            ),
          ),
          catchError((error) =>
            of(connectTrainingAdministratorFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  updateTrainingAdministratorInformations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTrainingAdministratorInformations),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ code, name, club }, adminInfo]) =>
        this.trainingService.updateTraining(code, adminInfo?.password ?? '', name, club).pipe(
          switchMap((training) =>
            of(updateTrainingAdministratorInformationsSuccess({ training })),
          ),
          catchError((error) =>
            of(
              updateTrainingAdministratorInformationsFailure({
                error: convertErrorToString(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  addTrainingMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addTrainingMember),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ code, name }, adminInfo]) =>
        this.trainingService.addMember(code, adminInfo?.password ?? '', name).pipe(
          switchMap((training) => of(addTrainingMemberSuccess({ training }))),
          catchError((error) =>
            of(addTrainingMemberFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  removeTrainingMember$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeTrainingMember),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ code, memberId }, adminInfo]) =>
        this.trainingService.removeMember(code, memberId, adminInfo?.password ?? '').pipe(
          switchMap((training) => of(removeTrainingMemberSuccess({ training }))),
          catchError((error) =>
            of(removeTrainingMemberFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // ---------------- Sessions ----------------

  createTrainingSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createTrainingSession),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ trainingCode, ...payload }, adminInfo]) =>
        this.trainingService
          .createSession(trainingCode, adminInfo?.password ?? '', payload)
          .pipe(
            switchMap((session) => of(createTrainingSessionSuccess({ session }))),
            catchError((error) =>
              of(createTrainingSessionFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  loadTrainingSessions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingSessions),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ trainingCode }, adminInfo]) =>
        this.trainingService.listSessions(trainingCode, adminInfo?.password ?? '').pipe(
          switchMap((sessions) => of(loadTrainingSessionsSuccess({ sessions }))),
          catchError((error) =>
            of(loadTrainingSessionsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  loadTrainingSessionPublic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingSessionPublic),
      switchMap(({ sessionCode }) =>
        this.trainingService.getSessionPublic(sessionCode).pipe(
          switchMap((session) => of(loadTrainingSessionPublicSuccess({ session }))),
          catchError((error) =>
            of(loadTrainingSessionPublicFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  connectTrainingSessionAdministrator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectTrainingSessionAdministrator),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode }, adminInfo]) =>
        this.trainingService.getSessionAdmin(sessionCode, adminInfo?.password ?? '').pipe(
          switchMap((session) => of(connectTrainingSessionAdministratorSuccess({ session }))),
          catchError((error) =>
            of(connectTrainingSessionAdministratorFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  closeTrainingSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(closeTrainingSession),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode }, adminInfo]) =>
        this.trainingService.closeSession(sessionCode, adminInfo?.password ?? '').pipe(
          switchMap((session) => of(closeTrainingSessionSuccess({ session }))),
          catchError((error) =>
            of(closeTrainingSessionFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  checkinTrainingParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkinTrainingParticipant),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode, memberId, name }, adminInfo]) =>
        this.trainingService
          .checkinParticipant(sessionCode, adminInfo?.password ?? '', memberId, name)
          .pipe(
            switchMap((session) => of(checkinTrainingParticipantSuccess({ session }))),
            catchError((error) =>
              of(checkinTrainingParticipantFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  removeTrainingParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeTrainingParticipant),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode, participantId }, adminInfo]) =>
        this.trainingService
          .removeParticipant(sessionCode, participantId, adminInfo?.password ?? '')
          .pipe(
            switchMap((session) => of(removeTrainingParticipantSuccess({ session }))),
            catchError((error) =>
              of(removeTrainingParticipantFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  loadTrainingLeaderboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingLeaderboard),
      switchMap(({ sessionCode }) =>
        this.trainingService.getLeaderboard(sessionCode).pipe(
          switchMap((leaderboard) => of(loadTrainingLeaderboardSuccess({ leaderboard }))),
          catchError((error) =>
            of(loadTrainingLeaderboardFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // ---------------- Teams ----------------

  createTrainingTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createTrainingTeam),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode, participantIds, name }, adminInfo]) =>
        this.trainingService
          .createTeam(sessionCode, adminInfo?.password ?? '', participantIds, name)
          .pipe(
            switchMap((session) => of(createTrainingTeamSuccess({ session }))),
            catchError((error) =>
              of(createTrainingTeamFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  dissolveTrainingTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(dissolveTrainingTeam),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode, teamId }, adminInfo]) =>
        this.trainingService.dissolveTeam(sessionCode, teamId, adminInfo?.password ?? '').pipe(
          switchMap((session) => of(dissolveTrainingTeamSuccess({ session }))),
          catchError((error) =>
            of(dissolveTrainingTeamFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // ---------------- Rounds ----------------

  generateTrainingRound$ = createEffect(() =>
    this.actions$.pipe(
      ofType(generateTrainingRound),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode }, adminInfo]) =>
        this.trainingService.generateRound(sessionCode, adminInfo?.password ?? '').pipe(
          switchMap((round) => of(generateTrainingRoundSuccess({ round }))),
          catchError((error) =>
            of(generateTrainingRoundFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  loadTrainingRounds$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingRounds),
      switchMap(({ sessionCode }) =>
        this.trainingService.listRounds(sessionCode).pipe(
          switchMap((rounds) => of(loadTrainingRoundsSuccess({ rounds }))),
          catchError((error) =>
            of(loadTrainingRoundsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  loadTrainingRound$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrainingRound),
      switchMap(({ sessionCode, roundNumber }) =>
        this.trainingService.getRound(sessionCode, roundNumber).pipe(
          switchMap((round) => of(loadTrainingRoundSuccess({ round }))),
          catchError((error) => of(loadTrainingRoundFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  // ---------------- Matches / score ----------------

  startTrainingMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startTrainingMatch),
      switchMap(({ sessionCode, matchId, participantCode }) =>
        this.trainingService.startMatch(sessionCode, matchId, participantCode).pipe(
          switchMap((match) => of(startTrainingMatchSuccess({ match }))),
          catchError((error) =>
            of(startTrainingMatchFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  updateTrainingScore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTrainingScore),
      switchMap(({ sessionCode, matchId, participantCode, scoreA, scoreB }) =>
        this.trainingService.updateScore(sessionCode, matchId, participantCode, scoreA, scoreB).pipe(
          switchMap((match) => of(updateTrainingScoreSuccess({ match }))),
          catchError((error) =>
            of(updateTrainingScoreFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  validateTrainingMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateTrainingMatch),
      switchMap(({ sessionCode, matchId, participantCode, opponentParticipantCode }) =>
        this.trainingService
          .validateMatch(sessionCode, matchId, participantCode, opponentParticipantCode)
          .pipe(
            switchMap((match) => of(validateTrainingMatchSuccess({ match }))),
            catchError((error) =>
              of(validateTrainingMatchFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  adminUpdateTrainingScore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminUpdateTrainingScore),
      withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
      switchMap(([{ sessionCode, matchId, scoreA, scoreB }, adminInfo]) =>
        this.trainingService
          .adminUpdateScore(sessionCode, matchId, adminInfo?.password ?? '', scoreA, scoreB)
          .pipe(
            switchMap((match) => of(adminUpdateTrainingScoreSuccess({ match }))),
            catchError((error) =>
              of(adminUpdateTrainingScoreFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  // ---------------- Disconnect / errors ----------------

  disconnectTrainingAdministrator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(disconnectTrainingAdministrator, createTraining),
      switchMap(() =>
        of(
          resetTraining(),
          removeLocalStorageData({ key: STORAGE_TRAINING_CODE_KEY }),
          removeLocalStorageData({ key: STORAGE_TRAINING_PASSWORD_KEY }),
        ),
      ),
    ),
  );

  trainingActionErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        updateTrainingAdministratorInformationsFailure,
        addTrainingMemberFailure,
        removeTrainingMemberFailure,
        createTrainingSessionFailure,
        closeTrainingSessionFailure,
        checkinTrainingParticipantFailure,
        removeTrainingParticipantFailure,
        createTrainingTeamFailure,
        dissolveTrainingTeamFailure,
        generateTrainingRoundFailure,
        startTrainingMatchFailure,
        updateTrainingScoreFailure,
        validateTrainingMatchFailure,
        adminUpdateTrainingScoreFailure,
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
