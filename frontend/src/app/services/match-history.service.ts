import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchHistoryDto } from 'src/app/models/player-match.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MatchHistoryService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getMatchHistory(tournamentCode: string, teamCode: string): Observable<MatchHistoryDto[]> {
    return this.http.get<MatchHistoryDto[]>(
      `${this.apiBaseUrl}/tournaments/${tournamentCode}/teams/${teamCode}/history`,
    );
  }
}
