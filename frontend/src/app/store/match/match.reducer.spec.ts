import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { resyncPending, wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import {
  loadTournamentInformationFailure,
  loadTournamentInformationSuccess,
} from 'src/app/store/tournament/tournament.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { loadCurrentMatchFailure, loadCurrentMatchSuccess } from './match.actions';
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

  it('unlocks it when the reload fails, rather than freezing the card', () => {
    const locked = matchReducer(withCurrent(match('m3', 3)), resyncPending());
    expect(matchReducer(locked, loadCurrentMatchFailure({ error: 'Erreur' })).awaitingResync).toBe(
      false,
    );
    expect(
      matchReducer(locked, loadTournamentInformationFailure({ error: 'Erreur' })).awaitingResync,
    ).toBe(false);
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
