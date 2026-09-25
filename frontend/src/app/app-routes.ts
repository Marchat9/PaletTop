import { Routes } from '@angular/router';
import { trainingAdminGuard } from './guards/training-admin.guard';

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
    loadComponent: () =>
      import('./pages/connections/admin-connection-page/admin-connection-page').then(
        (m) => m.AdminConnectionPageComponent,
      ),
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
    loadComponent: () =>
      import('./pages/connections/player-connection-page/player-connection-page').then(
        (m) => m.PlayerConnectionPage,
      ),
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
    loadComponent: () =>
      import('./pages/connections/spectator-connection-page/spectator-connection-page').then(
        (m) => m.SpectatorConnectionPageComponent,
      ),
  },
  {
    path: 'spectateur/:tournamentCode',
    loadComponent: () =>
      import('./pages/spectator-page/spectator-page').then((m) => m.SpectatorPageComponent),
  },
];

const trainingRoutes: Routes = [
  {
    path: 'admin/training-creation',
    loadComponent: () =>
      import('./pages/training-creation-page/training-creation-page').then(
        (m) => m.TrainingCreationPage,
      ),
  },
  {
    path: 'admin/training',
    loadComponent: () =>
      import('./pages/connections/training-admin-connection-page/training-admin-connection-page').then(
        (m) => m.TrainingAdminConnectionPage,
      ),
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
    loadComponent: () =>
      import('./pages/connections/training-player-connection-page/training-player-connection-page').then(
        (m) => m.TrainingPlayerConnectionPage,
      ),
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

  ...tournamentRoutes,
  ...trainingRoutes,

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
