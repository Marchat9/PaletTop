import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
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
      `${this.apiBaseUrl}/tournaments/${tournamentCode}/teams/${teamCode}/match`,
    );
  }

  public startMatch(code: string, matchId: string, teamCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/tournaments/${code}/matches/${matchId}/start`, {
      teamCode,
    });
  }

  public updateScore(
    code: string,
    matchId: string,
    teamCode: string,
    scoreA: number,
    scoreB: number,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}/tournaments/${code}/matches/${matchId}/score`,
      { teamCode, scoreA, scoreB },
    );
  }

  public validateMatch(
    code: string,
    matchId: string,
    teamCode: string,
    opponentTeamCode: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiBaseUrl}/tournaments/${code}/matches/${matchId}/validate`,
      { teamCode, opponentTeamCode },
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
      `${this.apiBaseUrl}/tournaments/${code}/matches/${matchId}/score/admin`,
      { password, scoreA, scoreB },
    );
  }
}
