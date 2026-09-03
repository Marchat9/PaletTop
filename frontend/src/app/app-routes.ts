import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  {
    path: 'accueil',
    loadComponent: () => import('./pages/home-page/home-page').then((m) => m.HomePageComponent),
  },
  {
    path: 'admin/tournament-creation',
    loadComponent: () =>
      import('./pages/tournament-create-page/tournament-create-page').then(
        (m) => m.TournamentCreatePageComponent,
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-connection-page/admin-connection-page').then(
        (m) => m.AdminConnectionPageComponent,
      ),
  },
  {
    path: 'admin/:tournamentCode',
    loadComponent: () =>
      import('./pages/admin-tournament-page/admin-tournament-page.component').then(
        (m) => m.AdminTournamentPageComponent,
      ),
  },
  {
    path: 'player',
    loadComponent: () =>
      import('./pages/player-connection-page/player-connection-page').then(
        (m) => m.PlayerConnectionPage,
      ),
  },
  {
    path: 'player/:tournamentCode/:teamCode',
    loadComponent: () =>
      import('./pages/player-team-match-page/player-team-match-page').then(
        (m) => m.PlayerTeamMatchPageComponent,
      ),
  },
  {
    path: 'spectateur',
    loadComponent: () =>
      import('./pages/spectator-connection-page/spectator-connection-page').then(
        (m) => m.SpectatorConnectionPageComponent,
      ),
  },
  {
    path: 'spectateur/:tournamentCode',
    loadComponent: () =>
      import('./pages/spectator-page/spectator-page').then((m) => m.SpectatorPageComponent),
  },
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
