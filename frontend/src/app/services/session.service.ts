import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getSessions(code: string): Observable<MatchesSessionDto[]> {
    return this.http.get<MatchesSessionDto[]>(`${this.apiBaseUrl}/tournaments/${code}/sessions`);
  }
}
