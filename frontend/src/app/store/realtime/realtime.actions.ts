import { createAction, props } from '@ngrx/store';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { MatchHistoryDto, PlayerMatchDto } from 'src/app/models/player-match.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

export const wsMatchUpdated = createAction(
  '[WS] Match Updated',
  props<{ match: PlayerMatchDto }>(),
);

export const wsSessionUpdated = createAction(
  '[WS] Session Updated',
  props<{ session: MatchesSessionDto }>(),
);

export const wsTournamentUpdated = createAction(
  '[WS] Tournament Updated',
  props<{ tournament: TournamentDto }>(),
);

export const wsHistoryUpdated = createAction(
  '[WS] History Updated',
  props<{ history: MatchHistoryDto[] }>(),
);

export const wsRankingUpdated = createAction(
  '[WS] Ranking Updated',
  props<{ ranking: GlobalRankingEntry[] }>(),
);
