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

export interface AppState {
  [appConfigFeatureKey]: AppConfigState;
  [tournamentFeatureKey]: TournamentState;
  [teamFeatureKey]: TeamState;
  [sessionFeatureKey]: SessionState;
  [matchFeatureKey]: MatchState;
  [matchHistoryFeatureKey]: MatchHistoryState;
  [rankingFeatureKey]: RankingState;
  [friendlyMatchFeatureKey]: FriendlyMatchState;
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
];
