import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ExpectedScore, previousScoreBody } from 'src/app/utils/stale-score.util';
import { Observable } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getCurrentMatch(
    tournamentCode: string,
    teamCode: string,
  ): Observable<Nullable<PlayerMatchDto>> {
    return this.http.get<Nullable<PlayerMatchDto>>(
      `${this.apiBaseUrl}/tournaments/${encodeURIComponent(tournamentCode)}/teams/${teamCode}/match`,
    );
  }

  public startMatch(code: string, matchId: string, teamCode: string): Observable<PlayerMatchDto> {
    return this.http.post<PlayerMatchDto>(
      `${this.apiBaseUrl}/tournaments/${encodeURIComponent(code)}/matches/${matchId}/start`,
      {
        teamCode,
      },
    );
  }

  public updateScore(
    code: string,
    matchId: string,
    teamCode: string,
    scoreA: number,
    scoreB: number,
    previous: Nullable<ExpectedScore> = null,
  ): Observable<{ match: PlayerMatchDto }> {
    return this.http.patch<{ match: PlayerMatchDto }>(
      `${this.apiBaseUrl}/tournaments/${encodeURIComponent(code)}/matches/${matchId}/score`,
      { teamCode, scoreA, scoreB, ...previousScoreBody(previous) },
    );
  }

  public validateMatch(
    code: string,
    matchId: string,
    teamCode: string,
    opponentTeamCode: string,
    seen: Nullable<ExpectedScore> = null,
  ): Observable<{ match: PlayerMatchDto }> {
    return this.http.post<{ match: PlayerMatchDto }>(
      `${this.apiBaseUrl}/tournaments/${encodeURIComponent(code)}/matches/${matchId}/validate`,
      { teamCode, opponentTeamCode, ...previousScoreBody(seen) },
    );
  }

  public adminUpdateScore(
    code: string,
    password: string,
    matchId: string,
    scoreA: number,
    scoreB: number,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}/tournaments/${encodeURIComponent(code)}/matches/${matchId}/score/admin`,
      { password, scoreA, scoreB },
    );
  }
}
