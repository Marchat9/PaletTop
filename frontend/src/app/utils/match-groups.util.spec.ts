import { MatchGroupKey, SessionMatchDto } from 'src/app/models/matches-session.model';
import { computeMatchGroups } from './match-groups.util';

function match(id: string, extra: Partial<SessionMatchDto> = {}): SessionMatchDto {
  return {
    id,
    status: 'PENDING',
    isBye: false,
    scoreA: null,
    scoreB: null,
    plateNumber: 1,
    teamA: { id: `${id}-a`, name: 'A' },
    teamB: { id: `${id}-b`, name: 'B' },
    poolNumber: 1,
    group: null,
    startedAt: null,
    finishedAt: null,
    duration: null,
    ...extra,
  } as SessionMatchDto;
}

describe('computeMatchGroups', () => {
  it('shows no label when the whole round is a single pool', () => {
    const groups = computeMatchGroups([match('m1'), match('m2', { plateNumber: 2 })]);

    expect(groups.map((group) => group.label)).toEqual([null]);
    expect(groups[0].matches.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('names the pools when there are several', () => {
    const groups = computeMatchGroups([match('m1'), match('m2', { poolNumber: 2 })]);

    expect(groups.map((group) => group.label)).toEqual(['Poule 1', 'Poule 2']);
  });

  it('keeps the label of a single bracket', () => {
    const groups = computeMatchGroups([
      match('m1', { poolNumber: null, group: { order: 1, name: MatchGroupKey.PRINCIPALE } }),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Tableau principal']);
  });
});
