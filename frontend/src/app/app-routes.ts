import { Routes } from '@angular/router';
import { trainingAdminGuard } from './guards/training-admin.guard';
import {
  ADMIN_TOURNAMENT_CONNECTION,
  ADMIN_TRAINING_CONNECTION,
  PLAYER_TOURNAMENT_CONNECTION,
  PLAYER_TRAINING_CONNECTION,
  SPECTATOR_TOURNAMENT_CONNECTION,
  SPECTATOR_TRAINING_CONNECTION,
} from './pages/connections/connection-page/connection-page.configs';
import { CONNECTION_ROUTE_DATA_KEY } from './pages/connections/connection-page/connection-page.model';

/** Entry of a universe without codes in the URL: one page, configured by the route. */
const connectionPage = () =>
  import('./pages/connections/connection-page/connection-page').then((m) => m.ConnectionPage);

const tournamentRoutes: Routes = [
  {
    path: 'admin/tournament-creation',
    loadComponent: () =>
      import('./pages/tournament-create-page/tournament-create-page').then(
        (m) => m.TournamentCreatePageComponent,
      ),
  },
  {
    path: 'admin/tournament',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: ADMIN_TOURNAMENT_CONNECTION },
  },
  {
    path: 'admin/tournament/:tournamentCode',
    loadComponent: () =>
      import('./pages/admin-tournament-page/admin-tournament-page.component').then(
        (m) => m.AdminTournamentPageComponent,
      ),
  },
  {
    path: 'player/tournament',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: PLAYER_TOURNAMENT_CONNECTION },
  },
  {
    path: 'player/tournament/:tournamentCode/:teamCode',
    loadComponent: () =>
      import('./pages/player-team-match-page/player-team-match-page').then(
        (m) => m.PlayerTeamMatchPageComponent,
      ),
  },
  {
    path: 'spectateur',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: SPECTATOR_TOURNAMENT_CONNECTION },
  },
  {
    path: 'spectateur/:tournamentCode',
    loadComponent: () =>
      import('./pages/spectator-page/spectator-page').then((m) => m.SpectatorPageComponent),
  },
];

const trainingRoutes: Routes = [
  {
    path: 'spectateur/training',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: SPECTATOR_TRAINING_CONNECTION },
  },
  {
    path: 'spectateur/training/:sessionCode',
    loadComponent: () =>
      import('./pages/spectator-training-page/spectator-training-page').then(
        (m) => m.SpectatorTrainingPage,
      ),
  },
  {
    path: 'admin/training-creation',
    loadComponent: () =>
      import('./pages/training-creation-page/training-creation-page').then(
        (m) => m.TrainingCreationPage,
      ),
  },
  {
    path: 'admin/training',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: ADMIN_TRAINING_CONNECTION },
  },
  {
    path: 'admin/training/:trainingCode',
    canActivate: [trainingAdminGuard],
    loadComponent: () =>
      import('./pages/admin-training-page/admin-training-page').then((m) => m.AdminTrainingPage),
  },
  {
    path: 'admin/training/:trainingCode/session-creation',
    canActivate: [trainingAdminGuard],
    loadComponent: () =>
      import('./pages/training-session-creation-page/training-session-creation-page').then(
        (m) => m.TrainingSessionCreationPage,
      ),
  },
  {
    path: 'admin/training/:trainingCode/session/:sessionCode',
    canActivate: [trainingAdminGuard],
    loadComponent: () =>
      import('./pages/admin-training-session-page/admin-training-session-page').then(
        (m) => m.AdminTrainingSessionPage,
      ),
  },
  {
    path: 'player/training',
    loadComponent: connectionPage,
    data: { [CONNECTION_ROUTE_DATA_KEY]: PLAYER_TRAINING_CONNECTION },
  },
  {
    path: 'player/training/:sessionCode/:participantCode',
    loadComponent: () =>
      import('./pages/player-training-session-page/player-training-session-page').then(
        (m) => m.PlayerTrainingSessionPage,
      ),
  },
];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  {
    path: 'accueil',
    loadComponent: () => import('./pages/home-page/home-page').then((m) => m.HomePageComponent),
  },

  // Training first: `spectateur/training` must not be read as `spectateur/:tournamentCode`.
  ...trainingRoutes,
  ...tournamentRoutes,

  {
    path: 'friendly-match',
    loadComponent: () =>
      import('./pages/friendly-match-page/friendly-match-page').then(
        (m) => m.FriendlyMatchPageComponent,
      ),
  },
  {
    path: 'super-admin',
    loadComponent: () =>
      import('./pages/super-admin-page/super-admin-page').then((m) => m.SuperAdminPageComponent),
  },
  { path: '**', redirectTo: 'accueil' },
];
