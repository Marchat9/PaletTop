import { loadMetrics, loadMetricsFailure, loadMetricsSuccess } from './metrics.actions';
import { initialMetricsState, metricsReducer } from './metrics.reducer';

const SAMPLE_METRICS = {
  tournaments: { total: 13, draft: 2, active: 3, completed: 7, cancelled: 1 },
  clubs: { total: 14 },
};

describe('metricsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(metricsReducer(undefined, { type: '@@INIT' })).toEqual(initialMetricsState);
  });

  it('sets isLoading on loadMetrics', () => {
    const state = metricsReducer(initialMetricsState, loadMetrics());
    expect(state).toEqual({ data: null, isLoading: true, error: null });
  });

  it('stores the metrics on loadMetricsSuccess', () => {
    const state = metricsReducer(
      initialMetricsState,
      loadMetricsSuccess({ metrics: SAMPLE_METRICS }),
    );
    expect(state).toEqual({ data: SAMPLE_METRICS, isLoading: false, error: null });
  });

  it('stores the error on loadMetricsFailure, keeping data null', () => {
    const state = metricsReducer(initialMetricsState, loadMetricsFailure({ error: 'boom' }));
    expect(state).toEqual({ data: null, isLoading: false, error: 'boom' });
  });
});
