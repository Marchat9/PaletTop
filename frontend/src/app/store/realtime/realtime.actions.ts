import { createAction, props } from '@ngrx/store';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { MatchHistoryDto, PlayerMatchDto } from 'src/app/models/player-match.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  TrainingLeaderboardEntryDto,
  TrainingMatchDto,
  TrainingRoundDto,
  TrainingSessionAdminDto,
  TrainingSessionPublicDto,
} from 'src/app/store/training/training.models';

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

// --------------------------- Entraînement ---------------------------
// Flux distinct de celui du tournoi : les deux gateways partagent des noms d'événements
// (`session:updated`, `match:updated`) avec des payloads différents.

// La room admin diffuse la vue complète, codes participants inclus ; la room publique la même
// séance sans eux. Les deux sont applicables telles quelles à leur destinataire.
export const wsTrainingSessionUpdated = createAction(
  '[WS] Training Session Updated',
  props<{ session: TrainingSessionAdminDto | TrainingSessionPublicDto }>(),
);

export const wsTrainingRoundGenerated = createAction(
  '[WS] Training Round Generated',
  props<{ round: TrainingRoundDto }>(),
);

export const wsTrainingMatchUpdated = createAction(
  '[WS] Training Match Updated',
  props<{ match: TrainingMatchDto }>(),
);

export const wsTrainingLeaderboardUpdated = createAction(
  '[WS] Training Leaderboard Updated',
  props<{ leaderboard: TrainingLeaderboardEntryDto[] }>(),
);
// ---------------------------------------------------------------------

// Generic signal that the app may have missed updates (websocket reconnected, or the
// tab/app came back to the foreground) and consumers should resync their own data.
export const resyncRequested = createAction('[Realtime] Resync Requested');
