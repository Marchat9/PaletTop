import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PlanPreviewBody, TournamentPlan } from '../models/tournament-plan.model';

@Injectable({ providedIn: 'root' })
export class TournamentPlanService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.backBaseApiUrl;

  public preview(body: PlanPreviewBody): Observable<TournamentPlan> {
    return this.http.post<TournamentPlan>(`${this.apiBaseUrl}/tournaments/plan-preview`, body);
  }
}
