import { createAction, props } from '@ngrx/store';
import { MetricsDto } from 'src/app/services/metrics.service';

export const loadMetrics = createAction('[Metrics] Load');
export const loadMetricsSuccess = createAction(
  '[Metrics] Load Success',
  props<{ metrics: MetricsDto }>(),
);
export const loadMetricsFailure = createAction(
  '[Metrics] Load Failure',
  props<{ error: string }>(),
);
