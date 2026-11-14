import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface TournamentClubSearchResponse {
  names: string[];
}

@Injectable({
  providedIn: 'root',
})
export class TournamentClubService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public searchClubs(
    tournamentCode: string,
    search: string,
    password: string,
  ): Observable<string[]> {
    return this.http
      .post<TournamentClubSearchResponse>(
        `${this.apiBaseUrl}/tournaments/${encodeURIComponent(tournamentCode)}/clubs/search`,
        { password, search },
      )
      .pipe(map(({ names }) => names));
  }
}
