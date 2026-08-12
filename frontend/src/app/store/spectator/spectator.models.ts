import { ApiCall } from 'src/app/models/api-call.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';

export interface SpectatorTournamentDto {
  id: string;
  code: string;
  name: string;
  status: TournamentStatus;
  phaseName: string;
  scoreCalculation: ScoreCalculation;
}

export interface SpectatorState {
  tournament: ApiCall<Nullable<SpectatorTournamentDto>>;
  sessions: MatchesSessionDto[];
  ranking: GlobalRankingEntry[];
}
