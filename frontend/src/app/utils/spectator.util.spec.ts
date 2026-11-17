import { describe, expect, it } from 'vitest';
import { LiveMatchView } from 'src/app/models/live-match.model';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { TrainingMatchDto } from 'src/app/store/training/training.models';
import {
  orderForBoard,
  spectatorPhase,
  toTournamentLiveMatches,
  toTrainingLiveMatches,
} from './spectator.util';

function live(id: string, status: string): LiveMatchView {
  return {
    id,
    status,
    isBye: false,
    plateNumber: null,
    groupLabel: null,
    teamA: 'A',
    teamB: 'B',
    scoreA: 0,
    scoreB: 0,
  };
}

describe('spectatorPhase', () => {
  it('attend tant que rien n’a commencé', () => {
    expect(spectatorPhase({ started: false, finished: false, matchStatuses: [] })).toBe('waiting');
  });

  it('est terminé une fois le tournoi ou la séance clos, quels que soient les matchs', () => {
    expect(spectatorPhase({ started: true, finished: true, matchStatuses: ['PENDING'] })).toBe(
      'finished',
    );
  });

  it('est en cours tant qu’un match du round n’est pas validé', () => {
    expect(
      spectatorPhase({ started: true, finished: false, matchStatuses: ['VALIDATED', 'ENDED'] }),
    ).toBe('live');
  });

  it('est entre deux rounds quand tous les matchs du round sont validés', () => {
    expect(
      spectatorPhase({ started: true, finished: false, matchStatuses: ['VALIDATED', 'VALIDATED'] }),
    ).toBe('break');
  });

  it('reste en cours sur un round qui n’a pas encore de match', () => {
    expect(spectatorPhase({ started: true, finished: false, matchStatuses: [] })).toBe('live');
  });
});

describe('orderForBoard', () => {
  it('met les matchs en cours d’abord, puis à valider, en attente et validés', () => {
    const ordered = orderForBoard([
      live('validated', 'VALIDATED'),
      live('pending', 'PENDING'),
      live('ended', 'ENDED'),
      live('ongoing', 'ONGOING'),
    ]);

    expect(ordered.map((match) => match.id)).toEqual(['ongoing', 'ended', 'pending', 'validated']);
  });

  it('garde l’ordre d’origine (les plaques) à statut égal', () => {
    const ordered = orderForBoard([live('p1', 'ONGOING'), live('p2', 'ONGOING')]);

    expect(ordered.map((match) => match.id)).toEqual(['p1', 'p2']);
  });
});

describe('toTournamentLiveMatches', () => {
  it('reprend plaque, équipes, scores et statut, sans équipe B pour un exempt', () => {
    const matches = toTournamentLiveMatches([
      {
        id: 'm1',
        status: 'ONGOING',
        isBye: false,
        scoreA: 9,
        scoreB: 6,
        plateNumber: 2,
        teamA: { id: 'a', name: 'Breizh Palet' },
        teamB: { id: 'b', name: 'Fanny Club' },
        poolNumber: null,
        group: null,
        startedAt: null,
        finishedAt: null,
        duration: null,
      },
      {
        id: 'm2',
        status: 'VALIDATED',
        isBye: true,
        scoreA: 13,
        scoreB: 0,
        plateNumber: null,
        teamA: { id: 'c', name: 'AS Plouër' },
        teamB: null,
        poolNumber: null,
        group: null,
        startedAt: null,
        finishedAt: null,
        duration: null,
      },
    ] as SessionMatchDto[]);

    expect(matches[0]).toMatchObject({
      id: 'm1',
      plateNumber: 2,
      teamA: 'Breizh Palet',
      teamB: 'Fanny Club',
      scoreA: 9,
      scoreB: 6,
      status: 'ONGOING',
    });
    expect(matches[1]).toMatchObject({ isBye: true, teamB: null });
  });
});

describe('toTrainingLiveMatches', () => {
  it('nomme une équipe éphémère par ses joueurs', () => {
    const [match] = toTrainingLiveMatches([
      {
        id: 't1',
        status: 'PENDING',
        isBye: false,
        scoreA: 0,
        scoreB: 0,
        teamA: {
          id: 'A',
          kind: 'EPHEMERAL',
          members: [
            { id: 'p1', name: 'Julie' },
            { id: 'p2', name: 'Erwan' },
          ],
        },
        teamB: { id: 'B', kind: 'FIXED', name: 'Les Galets', members: [] },
      },
    ] as unknown as TrainingMatchDto[]);

    expect(match).toMatchObject({
      teamA: 'Julie · Erwan',
      teamB: 'Les Galets',
      plateNumber: null,
    });
  });

  it('reprend la plaque du match quand elle est connue', () => {
    const [match] = toTrainingLiveMatches([
      {
        id: 't2',
        status: 'ONGOING',
        isBye: false,
        plateNumber: 3,
        scoreA: 4,
        scoreB: 2,
        teamA: { id: 'A', kind: 'FIXED', name: 'Les Galets', members: [] },
        teamB: { id: 'B', kind: 'FIXED', name: 'Les Plaqués', members: [] },
      },
    ] as unknown as TrainingMatchDto[]);

    expect(match.plateNumber).toBe(3);
  });
});
