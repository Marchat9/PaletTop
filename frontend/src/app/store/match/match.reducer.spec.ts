import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import { scoreSyncBadgeExpired, updateScoreFailure, updateScoreSuccess } from './match.actions';
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

describe('matchReducer score sync', () => {
  const request = { matchId: 'm3', teamCode: '1111', scoreA: 4, scoreB: 1 };

  it('keeps a score lost to the network as pending, without an error', () => {
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      updateScoreFailure({ error: 'Connexion au serveur impossible.', request, offline: true }),
    );
    expect(state.scoreSync).toEqual({ status: 'pending', pending: request });
    expect(state.scoreRequest.updateScore.error).toBeNull();
  });

  it('marks it synced once resent, shows the resent score, then hides the badge', () => {
    const pending = matchReducer(
      withCurrent(match('m3', 3)),
      updateScoreFailure({ error: '', request, offline: true }),
    );
    const synced = matchReducer(pending, updateScoreSuccess());
    expect(synced.scoreSync.status).toBe('synced');
    expect(synced.data.data?.scoreA).toBe(4);

    expect(matchReducer(synced, scoreSyncBadgeExpired()).scoreSync.status).toBe('idle');
  });

  it('drops the pending score when the server refuses it', () => {
    const pending = matchReducer(
      withCurrent(match('m3', 3)),
      updateScoreFailure({ error: '', request, offline: true }),
    );
    const refused = matchReducer(
      pending,
      updateScoreFailure({ error: 'Match validé', request, offline: false }),
    );
    expect(refused.scoreSync).toEqual({ status: 'idle', pending: null });
  });
});
