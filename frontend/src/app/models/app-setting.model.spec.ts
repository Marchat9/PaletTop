import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BYE_LOSER_SCORE_CAP,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from './app-setting.model';

describe('DEFAULT_SCORE_CALCULATIONS_BY_MODE', () => {
  it('offers the three victory-based calculations to the standard and up-down modes, goal-average first', () => {
    const expected = ['victory_goal_average', 'victory_best_defeats', 'victory_points_scored'];
    expect(DEFAULT_SCORE_CALCULATIONS_BY_MODE.standard).toEqual(expected);
    expect(DEFAULT_SCORE_CALCULATIONS_BY_MODE.up_down).toEqual(expected);
  });

  it('offers only the championship points to the championship', () => {
    expect(DEFAULT_SCORE_CALCULATIONS_BY_MODE.championship).toEqual(['tournament_score']);
  });
});

describe('DEFAULT_BYE_LOSER_SCORE_CAP', () => {
  it('mirrors the backend default: the loser of a bye gets at most 6 points', () => {
    expect(DEFAULT_BYE_LOSER_SCORE_CAP).toBe(6);
  });
});
