import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MetricsState } from './metrics.reducer';

export const metricsFeatureKey = 'metrics';

export const selectMetricsState = createFeatureSelector<MetricsState>(metricsFeatureKey);
export const selectMetrics = createSelector(selectMetricsState, (state) => state.data);
