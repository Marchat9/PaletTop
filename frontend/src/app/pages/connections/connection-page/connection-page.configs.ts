import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import { ConnectionPageConfig } from './connection-page.model';

export const ADMIN_TOURNAMENT_CONNECTION: ConnectionPageConfig<{ tournamentCode: string }> = {
  popup: () =>
    import('src/app/modales/admin-tournament-connection-popup/admin-tournament-connection-popup').then(
      (m) => m.AdminTournamentConnectionPopupComponent,
    ),
  popupData: (route) => ({ tournamentCode: route.queryParamMap.get('code') ?? undefined }),
  knownAccess: (store: Store) =>
    store
      .select(selectCurrentTournamentAdminInformations)
      .pipe(
        map((admin) => (admin?.code && admin.password ? { tournamentCode: admin.code } : null)),
      ),
  target: ({ tournamentCode }) => [`/admin/tournament/${tournamentCode}`],
};

export const PLAYER_TOURNAMENT_CONNECTION: ConnectionPageConfig<{
  tournamentCode: string;
  teamCode: string;
}> = {
  popup: () =>
    import('src/app/modales/join-tournament-popup/join-tournament-popup').then(
      (m) => m.JoinTournamentPopupComponent,
    ),
  target: ({ tournamentCode, teamCode }) => [`/player/tournament/${tournamentCode}/${teamCode}`],
};

export const SPECTATOR_TOURNAMENT_CONNECTION: ConnectionPageConfig<{ tournamentCode: string }> = {
  popup: () =>
    import('src/app/modales/spectate-tournament-popup/spectate-tournament-popup').then(
      (m) => m.SpectateTournamentPopupComponent,
    ),
  target: ({ tournamentCode }) => ['/spectateur', tournamentCode],
};

export const ADMIN_TRAINING_CONNECTION: ConnectionPageConfig<{ trainingCode: string }> = {
  popup: () =>
    import('src/app/modales/admin-training-connection-popup/admin-training-connection-popup').then(
      (m) => m.AdminTrainingConnectionPopupComponent,
    ),
  knownAccess: (store: Store) =>
    store
      .select(selectCurrentTrainingAdminInformations)
      .pipe(map((admin) => (admin?.code && admin.password ? { trainingCode: admin.code } : null))),
  target: ({ trainingCode }) => [`/admin/training/${trainingCode}`],
};

export const PLAYER_TRAINING_CONNECTION: ConnectionPageConfig<{
  sessionCode: string;
  participantCode: string;
}> = {
  popup: () =>
    import('src/app/modales/join-training-popup/join-training-popup').then(
      (m) => m.JoinTrainingPopup,
    ),
  target: ({ sessionCode, participantCode }) => [
    `/player/training/${sessionCode}/${participantCode}`,
  ],
};

export const SPECTATOR_TRAINING_CONNECTION: ConnectionPageConfig<{ sessionCode: string }> = {
  popup: () =>
    import('src/app/modales/spectate-training-popup/spectate-training-popup').then(
      (m) => m.SpectateTrainingPopup,
    ),
  target: ({ sessionCode }) => ['/spectateur/training', sessionCode],
};
