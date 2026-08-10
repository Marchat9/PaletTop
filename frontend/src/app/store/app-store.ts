import { ActionReducerMap } from '@ngrx/store';
import { AppConfigEffects } from 'src/app/store/app-config/app-config.effects';
import { AppConfigState } from './app-config/app-config.model';
import { appConfigReducer } from './app-config/app-config.reducer';
import { appConfigFeatureKey } from './app-config/app-config.selectors';
import { TournamentEffects } from './tournament/tournament.effects';
import { TournamentState } from './tournament/tournament.models';
import { tournamentReducer } from './tournament/tournament.reducer';
import { tournamentFeatureKey } from './tournament/tournament.selectors';
import { RealtimeEffects } from 'src/app/store/realtime/realtime.effects';
import { TeamEffects } from './team/team.effects';
import { TeamState } from './team/team.reducer';
import { teamReducer } from './team/team.reducer';
import { teamFeatureKey } from './team/team.selectors';
import { SessionEffects } from './session/session.effects';
import { SessionState } from './session/session.reducer';
import { sessionReducer } from './session/session.reducer';
import { sessionFeatureKey } from './session/session.selectors';
import { MatchEffects } from './match/match.effects';
import { MatchState } from './match/match.reducer';
import { matchReducer } from './match/match.reducer';
import { matchFeatureKey } from './match/match.selectors';
import { MatchHistoryEffects } from './match-history/match-history.effects';
import { MatchHistoryState } from './match-history/match-history.reducer';
import { matchHistoryReducer } from './match-history/match-history.reducer';
import { matchHistoryFeatureKey } from './match-history/match-history.selectors';
import { RankingEffects } from './ranking/ranking.effects';
import { RankingState } from './ranking/ranking.reducer';
import { rankingReducer } from './ranking/ranking.reducer';
import { rankingFeatureKey } from './ranking/ranking.selectors';
import { FriendlyMatchState } from './friendly-match/friendly-match.reducer';
import { friendlyMatchReducer } from './friendly-match/friendly-match.reducer';
import { friendlyMatchFeatureKey } from './friendly-match/friendly-match.selectors';
import { SuperAdminEffects } from './superadmin/superadmin.effects';
import { SuperAdminState } from './superadmin/superadmin.reducer';
import { superadminReducer } from './superadmin/superadmin.reducer';
import { superadminFeatureKey } from './superadmin/superadmin.selectors';
import { MetricsEffects } from './metrics/metrics.effects';
import { MetricsState } from './metrics/metrics.reducer';
import { metricsReducer } from './metrics/metrics.reducer';
import { metricsFeatureKey } from './metrics/metrics.selectors';
import { SuperAdminTournamentsEffects } from './superadmin-tournaments/superadmin-tournaments.effects';
import { SuperAdminTournamentsState } from './superadmin-tournaments/superadmin-tournaments.reducer';
import { superAdminTournamentsReducer } from './superadmin-tournaments/superadmin-tournaments.reducer';
import { superAdminTournamentsFeatureKey } from './superadmin-tournaments/superadmin-tournaments.selectors';
import { SuperAdminClubsEffects } from './superadmin-clubs/superadmin-clubs.effects';
import { SuperAdminClubsState } from './superadmin-clubs/superadmin-clubs.reducer';
import { superAdminClubsReducer } from './superadmin-clubs/superadmin-clubs.reducer';
import { superAdminClubsFeatureKey } from './superadmin-clubs/superadmin-clubs.selectors';

export interface AppState {
  [appConfigFeatureKey]: AppConfigState;
  [tournamentFeatureKey]: TournamentState;
  [teamFeatureKey]: TeamState;
  [sessionFeatureKey]: SessionState;
  [matchFeatureKey]: MatchState;
  [matchHistoryFeatureKey]: MatchHistoryState;
  [rankingFeatureKey]: RankingState;
  [friendlyMatchFeatureKey]: FriendlyMatchState;
  [superadminFeatureKey]: SuperAdminState;
  [metricsFeatureKey]: MetricsState;
  [superAdminTournamentsFeatureKey]: SuperAdminTournamentsState;
  [superAdminClubsFeatureKey]: SuperAdminClubsState;
}

export const reducers: ActionReducerMap<AppState> = {
  [appConfigFeatureKey]: appConfigReducer,
  [tournamentFeatureKey]: tournamentReducer,
  [teamFeatureKey]: teamReducer,
  [sessionFeatureKey]: sessionReducer,
  [matchFeatureKey]: matchReducer,
  [matchHistoryFeatureKey]: matchHistoryReducer,
  [rankingFeatureKey]: rankingReducer,
  [friendlyMatchFeatureKey]: friendlyMatchReducer,
  [superadminFeatureKey]: superadminReducer,
  [metricsFeatureKey]: metricsReducer,
  [superAdminTournamentsFeatureKey]: superAdminTournamentsReducer,
  [superAdminClubsFeatureKey]: superAdminClubsReducer,
};

export const effects = [
  AppConfigEffects,
  TournamentEffects,
  RealtimeEffects,
  TeamEffects,
  SessionEffects,
  MatchEffects,
  MatchHistoryEffects,
  RankingEffects,
  SuperAdminEffects,
  MetricsEffects,
  SuperAdminTournamentsEffects,
  SuperAdminClubsEffects,
];
