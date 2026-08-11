import { describe, expect, it } from 'vitest';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import {
  wsMatchUpdated,
  wsRankingUpdated,
  wsSessionUpdated,
  wsTournamentUpdated,
} from 'src/app/store/realtime/realtime.actions';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
  loadSpectatorTournament,
  loadSpectatorTournamentFailure,
  loadSpectatorTournamentSuccess,
  resetSpectator,
} from './spectator.actions';
import { initialSpectatorState, spectatorReducer } from './spectator.reducer';
import { SpectatorTournamentDto } from './spectator.models';

const TOURNAMENT: SpectatorTournamentDto = {
  id: 'tournament-1',
  code: 'ABC123',
  name: 'Tournoi du Printemps',
  status: TournamentStatus.ACTIVE,
  phaseName: 'Phase qualificative',
  scoreCalculation: 'score',
};

const SESSION: MatchesSessionDto = {
  id: 'session-1',
  sessionNumber: 1,
  status: SessionStatus.OPEN,
  matches: [
    {
      id: 'match-1',
      status: 'PENDING',
      isBye: false,
      scoreA: 0,
      scoreB: 0,
      plateNumber: 3,
      teamA: { id: 'team-a', name: 'Équipe A' },
      teamB: { id: 'team-b', name: 'Équipe B' },
      poolNumber: 1,
      group: null,
      startedAt: null,
      finishedAt: null,
      duration: null,
    },
  ],
};

const RANKING: GlobalRankingEntry[] = [
  {
    rank: 1,
    teamId: 'team-a',
    teamName: 'Équipe A',
    wins: 2,
    pointsFor: 10,
    pointsAgainst: 4,
    goalAverage: 6,
    matchesPlayed: 2,
    tournamentPoints: 6,
  },
];

describe('spectatorReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(spectatorReducer(undefined, { type: '@@INIT' })).toEqual(initialSpectatorState);
  });

  it('sets isLoading on loadSpectatorTournament', () => {
    const state = spectatorReducer(
      initialSpectatorState,
      loadSpectatorTournament({ tournamentCode: 'ABC123' }),
    );
    expect(state.tournament).toEqual({ data: null, isLoading: true, error: null });
  });

  it('stores tournament, sessions and ranking on loadSpectatorTournamentSuccess', () => {
    const state = spectatorReducer(
      initialSpectatorState,
      loadSpectatorTournamentSuccess({
        tournament: TOURNAMENT,
        sessions: [SESSION],
        ranking: RANKING,
      }),
    );
    expect(state.tournament).toEqual({ data: TOURNAMENT, isLoading: false, error: null });
    expect(state.sessions).toEqual([SESSION]);
    expect(state.ranking).toEqual(RANKING);
  });

  it('stores the error on loadSpectatorTournamentFailure', () => {
    const state = spectatorReducer(
      initialSpectatorState,
      loadSpectatorTournamentFailure({ error: 'Tournoi introuvable' }),
    );
    expect(state.tournament.error).toBe('Tournoi introuvable');
  });

  it('resets to the initial state on resetSpectator', () => {
    const loaded = spectatorReducer(
      initialSpectatorState,
      loadSpectatorTournamentSuccess({
        tournament: TOURNAMENT,
        sessions: [SESSION],
        ranking: RANKING,
      }),
    );
    expect(spectatorReducer(loaded, resetSpectator())).toEqual(initialSpectatorState);
  });

  it('replaces the ranking wholesale on wsRankingUpdated', () => {
    const state = spectatorReducer(initialSpectatorState, wsRankingUpdated({ ranking: RANKING }));
    expect(state.ranking).toEqual(RANKING);
  });

  it('refreshes the tournament status on wsTournamentUpdated', () => {
    const loaded = spectatorReducer(
      initialSpectatorState,
      loadSpectatorTournamentSuccess({ tournament: TOURNAMENT, sessions: [], ranking: [] }),
    );
    const state = spectatorReducer(
      loaded,
      wsTournamentUpdated({
        tournament: { ...TOURNAMENT, status: TournamentStatus.FINISHED } as any,
      }),
    );
    expect(state.tournament.data?.status).toBe(TournamentStatus.FINISHED);
  });

  it('appends a new session on wsSessionUpdated', () => {
    const NEW_SESSION: MatchesSessionDto = { ...SESSION, id: 'session-2', sessionNumber: 2 };
    const state = spectatorReducer(
      { ...initialSpectatorState, sessions: [SESSION] },
      wsSessionUpdated({ session: NEW_SESSION }),
    );
    expect(state.sessions).toEqual([SESSION, NEW_SESSION]);
  });

  it('merges live match fields while preserving group/poolNumber/team code on wsMatchUpdated', () => {
    const initial = { ...initialSpectatorState, sessions: [SESSION] };
    const liveUpdate: PlayerMatchDto = {
      id: 'match-1',
      status: 'ONGOING',
      isBye: false,
      scoreA: 5,
      scoreB: 3,
      plateNumber: 3,
      teamA: { id: 'team-a', name: 'Équipe A' },
      teamB: { id: 'team-b', name: 'Équipe B' },
      startedAt: '2026-08-11T10:00:00.000Z',
      finishedAt: null,
      duration: null,
      session: { id: 'session-1', sessionNumber: 1 },
    };

    const state = spectatorReducer(initial, wsMatchUpdated({ match: liveUpdate }));

    const updatedMatch = state.sessions[0].matches[0];
    expect(updatedMatch.status).toBe('ONGOING');
    expect(updatedMatch.scoreA).toBe(5);
    expect(updatedMatch.scoreB).toBe(3);
    expect(updatedMatch.startedAt).toBe('2026-08-11T10:00:00.000Z');
    expect(updatedMatch.poolNumber).toBe(1);
    expect(updatedMatch.group).toBeNull();
  });
});
