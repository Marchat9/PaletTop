import { createAction, props } from '@ngrx/store';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { SpectatorTournamentDto } from './spectator.models';

export const loadSpectatorTournament = createAction(
  '[Spectator] Load Spectator Tournament',
  props<{ tournamentCode: string }>(),
);
export const loadSpectatorTournamentSuccess = createAction(
  '[Spectator] Load Spectator Tournament Success',
  props<{
    tournament: SpectatorTournamentDto;
    sessions: MatchesSessionDto[];
    ranking: GlobalRankingEntry[];
  }>(),
);
export const loadSpectatorTournamentFailure = createAction(
  '[Spectator] Load Spectator Tournament Failure',
  props<{ error: string }>(),
);

export const resetSpectator = createAction('[Spectator] Reset Spectator');

export const leaveSpectatorPage = createAction('[Spectator] Leave Spectator Page');
