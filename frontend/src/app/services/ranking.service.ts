import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public getRanking(code: string): Observable<GlobalRankingEntry[]> {
    return this.http.get<GlobalRankingEntry[]>(`${this.apiBaseUrl}/tournaments/${code}/ranking`);
  }
}
