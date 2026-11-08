import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import { initialMatchState, matchReducer } from './match.reducer';

function match(id: string, sessionNumber: number, scoreA = 0): PlayerMatchDto {
  return {
    id,
    status: 'ONGOING',
    isBye: false,
    scoreA,
    scoreB: 0,
    plateNumber: 1,
    teamA: { id: 'a', name: 'A' },
    teamB: { id: 'b', name: 'B' },
    startedAt: null,
    finishedAt: null,
    duration: null,
    session: { id: `s${sessionNumber}`, sessionNumber },
  };
}

function withCurrent(current: PlayerMatchDto) {
  return { ...initialMatchState, data: { data: current, isLoading: false, error: null } };
}

describe('matchReducer wsMatchUpdated', () => {
  it('updates the current match', () => {
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      wsMatchUpdated({ match: match('m3', 3, 7) }),
    );
    expect(state.data.data?.scoreA).toBe(7);
  });

  it('keeps the current match when an older session match is corrected', () => {
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      wsMatchUpdated({ match: match('m2', 2, 13) }),
    );
    expect(state.data.data?.id).toBe('m3');
  });

  it('switches to the match of a newer session', () => {
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      wsMatchUpdated({ match: match('m4', 4) }),
    );
    expect(state.data.data?.id).toBe('m4');
  });
});
