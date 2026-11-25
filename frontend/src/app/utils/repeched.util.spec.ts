import { describe, expect, it } from 'vitest';
import {
  MatchesSessionDto,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { computeRepechedByBracket } from './repeched.util';

const LABELS: Record<string, string> = {
  principale: 'Principale',
  consolante_1: 'Consolante A',
  consolante_2: 'Consolante B',
  challenge_consolante_2: 'Challenge Consolante B',
};

function match(
  id: string,
  bracket: string,
  a: [string, number],
  b: [string, number],
): SessionMatchDto {
  return {
    id,
    status: 'VALIDATED',
    isBye: false,
    scoreA: a[1],
    scoreB: b[1],
    plateNumber: 1,
    teamA: { id: a[0], name: a[0].toUpperCase() },
    teamB: { id: b[0], name: b[0].toUpperCase() },
    poolNumber: null,
    group: { order: 1, name: bracket, label: LABELS[bracket] },
    startedAt: null,
    finishedAt: null,
    duration: null,
  };
}

function session(
  sessionNumber: number,
  matches: SessionMatchDto[],
  status = SessionStatus.CLOSED,
): MatchesSessionDto {
  return { id: `s${sessionNumber}`, sessionNumber, status, isDrawnRound: false, matches };
}

describe('computeRepechedByBracket', () => {
  const sessions = [
    session(5, [
      match('m1', 'consolante_2', ['a', 11], ['b', 10]),
      match('m2', 'consolante_2', ['c', 11], ['d', 9]),
      match('m3', 'consolante_2', ['e', 11], ['f', 3]),
      match('m4', 'challenge_consolante_2', ['g', 11], ['h', 2]),
      match('m5', 'consolante_1', ['i', 11], ['j', 4]),
    ]),
    session(6, [
      match('m6', 'consolante_2', ['a', 11], ['d', 5]),
      match('m7', 'consolante_2', ['c', 11], ['b', 7]),
      match('m8', 'consolante_1', ['i', 11], ['k', 0]),
    ]),
  ];

  it('lists the first-round losers who play the next round of their bracket, by closeness of the defeat', () => {
    const lists = computeRepechedByBracket(sessions);

    expect(lists.map((list) => list.key)).toEqual(['consolante_2']);
    expect(lists[0].label).toBe('Consolante B');
    expect(lists[0].teams.map((team) => [team.teamName, team.defeat])).toEqual([
      ['B', '10–11'],
      ['D', '9–11'],
    ]);
  });

  it('lists nobody before the second round of a bracket', () => {
    expect(computeRepechedByBracket([sessions[0]])).toEqual([]);
  });

  it('leaves out the challenges and the brackets that bring nobody back', () => {
    const noOne = computeRepechedByBracket([
      session(5, [match('m1', 'consolante_1', ['a', 11], ['b', 10])]),
      session(6, [match('m2', 'consolante_1', ['a', 11], ['c', 10])]),
    ]);

    expect(noOne).toEqual([]);
  });

  it('orders the brackets like the backend', () => {
    const lists = computeRepechedByBracket([
      session(5, [
        match('m1', 'consolante_2', ['a', 11], ['b', 10]),
        match('m2', 'consolante_1', ['c', 11], ['d', 10]),
      ]),
      session(6, [
        match('m3', 'consolante_2', ['a', 11], ['b', 1]),
        match('m4', 'consolante_1', ['c', 11], ['d', 1]),
      ]),
    ]);

    expect(lists.map((list) => list.label)).toEqual(['Consolante A', 'Consolante B']);
  });
});
