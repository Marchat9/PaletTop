import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from 'src/environments/environment';
import { PlanPreviewBody, TournamentPlan } from '../models/tournament-plan.model';
import { TournamentPlanService } from './tournament-plan.service';

describe('TournamentPlanService', () => {
  it('posts the body to the plan-preview endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const body = { competitionMode: 'standard', teamCount: 12, targetCount: 16 } as PlanPreviewBody;
    const plan = { teamCount: 12 } as TournamentPlan;
    let result: TournamentPlan | undefined;

    TestBed.inject(TournamentPlanService)
      .preview(body)
      .subscribe((value) => (result = value));

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(`${environment.backBaseApiUrl}/tournaments/plan-preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(plan);
    expect(result).toEqual(plan);
    http.verify();
  });
});
