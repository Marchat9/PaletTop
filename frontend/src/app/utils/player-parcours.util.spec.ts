import { describe, expect, it } from 'vitest';
import {
  MatchesSessionDto,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { computePlayerParcours } from './player-parcours.util';

function match(
  id: string,
  scoreA: number,
  scoreB: number,
  group: string | null,
  extra: Partial<SessionMatchDto> = {},
): SessionMatchDto {
  return {
    id,
    status: 'VALIDATED',
    isBye: false,
    scoreA,
    scoreB,
    plateNumber: 49,
    teamA: { id: 'me', name: 'Fer et Fier' },
    teamB: { id: 'other', name: 'Les Bigorneaux' },
    poolNumber: null,
    group: group ? { order: 6, name: 'consolante_2', label: group } : null,
    startedAt: null,
    finishedAt: null,
    duration: null,
    ...extra,
  };
}

function session(
  sessionNumber: number,
  status: SessionStatus,
  matches: SessionMatchDto[],
): MatchesSessionDto {
  return { id: `s${sessionNumber}`, sessionNumber, status, isDrawnRound: false, matches };
}

const CLOSED = SessionStatus.CLOSED;
const OPEN = SessionStatus.OPEN;

describe('computePlayerParcours', () => {
  it('sums up the qualifiers, then lists each elimination round with its bracket', () => {
    const steps = computePlayerParcours(
      [
        session(1, CLOSED, [match('m1', 11, 5, null)]),
        session(2, CLOSED, [match('m2', 3, 11, null)]),
        session(3, CLOSED, [match('m3', 11, 9, 'Consolante B')]),
        session(4, OPEN, [match('m4', 0, 0, 'Consolante B')]),
      ],
      'me',
      undefined,
    );

    expect(steps.map((step) => [step.state, step.text])).toEqual([
      ['done', 'Qualifs : 1 victoire, 1 défaite'],
      ['done', 'Élim. 1 · Consolante B : gagné 11–9'],
      ['current', 'Élim. 2 · Consolante B · plaque 49'],
    ]);
  });

  it('says the team was brought back when it lost and plays again in the same bracket', () => {
    const steps = computePlayerParcours(
      [
        session(1, CLOSED, [match('m1', 11, 5, null)]),
        session(2, CLOSED, [match('m2', 10, 11, 'Consolante B')]),
        session(3, OPEN, [match('m3', 0, 0, 'Consolante B')]),
      ],
      'me',
      'Consolante B',
    );

    expect(steps[1].text).toBe('Élim. 1 · Consolante B : perdu 10–11, repêchés');
    expect(steps[2].state).toBe('current');
  });

  it('reads the score from the side of the team when it is team B', () => {
    const steps = computePlayerParcours(
      [
        session(1, CLOSED, [
          match('m1', 4, 11, null, {
            teamA: { id: 'other', name: 'Les Bigorneaux' },
            teamB: { id: 'me', name: 'Fer et Fier' },
          }),
        ]),
      ],
      'me',
      undefined,
    );

    expect(steps[0].text).toBe('Qualifs : 1 victoire');
  });

  it('shows a bye of an elimination round as an exemption', () => {
    const steps = computePlayerParcours(
      [
        session(1, CLOSED, [match('m1', 11, 5, null)]),
        session(2, CLOSED, [match('m2', 0, 0, 'Principale', { isBye: true, teamB: null })]),
      ],
      'me',
      undefined,
    );

    expect(steps[1].text).toBe('Élim. 1 · Principale : exempt');
  });

  it('is empty when the team plays no round', () => {
    expect(
      computePlayerParcours([session(1, OPEN, [match('m1', 0, 0, null)])], 'nobody', undefined),
    ).toEqual([]);
  });
});
