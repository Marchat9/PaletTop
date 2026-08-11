import { Routes } from '@angular/router';
import { AdminTournamentPageComponent } from './pages/admin-tournament-page/admin-tournament-page.component';
import { HomePageComponent } from './pages/home-page/home-page';
import { PlayerTeamMatchPageComponent } from './pages/player-team-match-page/player-team-match-page';
import { TournamentCreatePageComponent } from './pages/tournament-create-page/tournament-create-page';
import { AdminConnectionPageComponent } from './pages/admin-connection-page/admin-connection-page';
import { PlayerConnectionPage } from './pages/player-connection-page/player-connection-page';
import { SpectatorConnectionPageComponent } from 'src/app/pages/spectator-connection-page/spectator-connection-page';
import { SpectatorPageComponent } from 'src/app/pages/spectator-page/spectator-page';
import { FriendlyMatchPageComponent } from './pages/friendly-match-page/friendly-match-page';
import { SuperAdminPageComponent } from './pages/super-admin-page/super-admin-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  { path: 'accueil', component: HomePageComponent },
  { path: 'admin/tournament-creation', component: TournamentCreatePageComponent },
  { path: 'admin', component: AdminConnectionPageComponent },
  { path: 'admin/:tournamentCode', component: AdminTournamentPageComponent },
  { path: 'player', component: PlayerConnectionPage },
  { path: 'player/:tournamentCode/:teamCode', component: PlayerTeamMatchPageComponent },
  { path: 'spectateur', component: SpectatorConnectionPageComponent },
  { path: 'spectateur/:tournamentCode', component: SpectatorPageComponent },
  { path: 'friendly-match', component: FriendlyMatchPageComponent },
  { path: 'super-admin', component: SuperAdminPageComponent },
  { path: '**', redirectTo: 'accueil' },
];
