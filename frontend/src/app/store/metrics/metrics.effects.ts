import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MetricsService } from 'src/app/services/metrics.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { loadMetrics, loadMetricsFailure, loadMetricsSuccess } from './metrics.actions';

@Injectable()
export class MetricsEffects {
  private readonly actions$ = inject(Actions);
  private readonly metricsService = inject(MetricsService);

  loadMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMetrics),
      switchMap(() =>
        this.metricsService.getMetrics().pipe(
          map((metrics) => loadMetricsSuccess({ metrics })),
          catchError((error) => of(loadMetricsFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );
}
