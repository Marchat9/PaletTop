import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { resyncPending, wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import {
  loadTournamentInformationFailure,
  loadTournamentInformationSuccess,
} from 'src/app/store/tournament/tournament.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
  loadCurrentMatchFailure,
  loadCurrentMatchSuccess,
  startMatchSuccess,
  updateScoreFailure,
  validateMatchSuccess,
} from './match.actions';
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

describe('matchReducer resync lock', () => {
  it('locks the score entry as soon as a resync is pending', () => {
    const state = matchReducer(withCurrent(match('m3', 3)), resyncPending());
    expect(state.awaitingResync).toBe(true);
  });

  it('unlocks it once the current match is reloaded', () => {
    const locked = matchReducer(withCurrent(match('m3', 3)), resyncPending());
    const state = matchReducer(locked, loadCurrentMatchSuccess({ match: match('m3', 3, 5) }));
    expect(state.awaitingResync).toBe(false);
    expect(state.data.data?.scoreA).toBe(5);
  });

  it('clears a score sending error once the current match is reloaded', () => {
    const failed = matchReducer(
      withCurrent(match('m3', 3)),
      updateScoreFailure({ error: 'Connexion au serveur impossible.' }),
    );
    const state = matchReducer(failed, loadCurrentMatchSuccess({ match: match('m3', 3, 5) }));
    expect(state.scoreRequest.updateScore.error).toBeNull();
  });

  it('keeps it locked when the reload fails: the score shown may be stale', () => {
    const locked = matchReducer(withCurrent(match('m3', 3)), resyncPending());
    expect(matchReducer(locked, loadCurrentMatchFailure({ error: 'Erreur' })).awaitingResync).toBe(
      true,
    );
    expect(
      matchReducer(locked, loadTournamentInformationFailure({ error: 'Erreur' })).awaitingResync,
    ).toBe(true);
  });

  it('does not lock anything when a load fails outside a resync', () => {
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      loadCurrentMatchFailure({ error: 'Erreur' }),
    );
    expect(state.awaitingResync).toBe(false);
  });

  it('unlocks it for a draft tournament, which has no match to reload', () => {
    const locked = matchReducer(initialMatchState, resyncPending());
    const tournament = (status: TournamentStatus) => ({ status }) as TournamentDto;

    const draft = matchReducer(
      locked,
      loadTournamentInformationSuccess({
        tournament: tournament(TournamentStatus.DRAFT),
        teamCode: 'AB12',
      }),
    );
    const active = matchReducer(
      locked,
      loadTournamentInformationSuccess({
        tournament: tournament(TournamentStatus.ACTIVE),
        teamCode: 'AB12',
      }),
    );

    expect(draft.awaitingResync).toBe(false);
    // Active: the current match reload that follows is what unlocks it.
    expect(active.awaitingResync).toBe(true);
  });
});

describe('matchReducer without websocket', () => {
  it('shows the started match from the response', () => {
    const started = { ...match('m3', 3), startedAt: '2026-11-09T10:00:00Z' };
    const state = matchReducer(withCurrent(match('m3', 3)), startMatchSuccess({ match: started }));
    expect(state.data.data).toEqual(started);
  });

  it('shows the validated match from the response', () => {
    const validated = { ...match('m3', 3, 13), status: 'VALIDATED' } as PlayerMatchDto;
    const state = matchReducer(
      withCurrent(match('m3', 3)),
      validateMatchSuccess({ match: validated }),
    );
    expect(state.data.data?.status).toBe('VALIDATED');
  });

  it('keeps the next session match when the response of an older one arrives late', () => {
    const state = matchReducer(
      withCurrent(match('m4', 4)),
      validateMatchSuccess({ match: match('m3', 3, 13) }),
    );
    expect(state.data.data?.id).toBe('m4');
  });
});
