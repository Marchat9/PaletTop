import { createReducer, on } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import { MetricsDto } from 'src/app/services/metrics.service';
import { loadMetrics, loadMetricsFailure, loadMetricsSuccess } from './metrics.actions';
import { ApiCall } from 'src/app/models/api-call.model';

export type MetricsState = ApiCall<Nullable<MetricsDto>>;

export const initialMetricsState: MetricsState = { data: null, isLoading: false, error: null };

export const metricsReducer = createReducer(
  initialMetricsState,
  on(loadMetrics, (state) => ({ ...state, isLoading: true, error: null })),
  on(loadMetricsSuccess, (state, { metrics }) => ({
    data: metrics,
    isLoading: false,
    error: null,
  })),
  on(loadMetricsFailure, (state, { error }) => ({ data: null, isLoading: false, error })),
);
