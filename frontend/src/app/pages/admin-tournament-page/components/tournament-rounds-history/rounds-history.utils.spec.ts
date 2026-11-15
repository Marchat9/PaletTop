import {
  MatchesSessionDto,
  MatchGroupKey,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { buildRoundHistoryViews } from './rounds-history.utils';

function match(id: string, teamA: string, teamB: string, extra: Partial<SessionMatchDto> = {}) {
  return {
    id,
    status: 'VALIDATED',
    isBye: false,
    scoreA: 13,
    scoreB: 7,
    plateNumber: 1,
    teamA: { id: `${id}-a`, name: teamA },
    teamB: { id: `${id}-b`, name: teamB },
    poolNumber: 1,
    group: null,
    startedAt: null,
    finishedAt: null,
    duration: null,
    ...extra,
  } as SessionMatchDto;
}

function session(
  sessionNumber: number,
  status: SessionStatus,
  isDrawnRound: boolean,
  matches: SessionMatchDto[],
): MatchesSessionDto {
  return { id: `s${sessionNumber}`, sessionNumber, status, isDrawnRound, matches };
}

const SESSIONS: MatchesSessionDto[] = [
  session(1, SessionStatus.CLOSED, true, [
    match('m1', 'Les Galets', 'Palet Club'),
    match('m2', 'Équipe 7', 'Breizh Palet'),
    match('bye', 'Fanny Club', '', { isBye: true, teamB: null }),
  ]),
  session(2, SessionStatus.CLOSED, false, [
    match('m3', 'Les Galets', 'Équipe 7', {
      group: { order: 1, name: MatchGroupKey.PRINCIPALE },
      poolNumber: null,
    }),
  ]),
  session(3, SessionStatus.OPEN, false, [match('m4', 'Les Galets', 'Breizh Palet')]),
];

describe('buildRoundHistoryViews', () => {
  it('lists the closed rounds only, most recent first', () => {
    const views = buildRoundHistoryViews(SESSIONS, 'standard', true, '');

    expect(views.map((view) => view.sessionNumber)).toEqual([2, 1]);
  });

  it('names the phase and counts the played matches, byes left out', () => {
    const [bracket, qualifying] = buildRoundHistoryViews(SESSIONS, 'standard', true, '');

    expect(bracket.label).toBe('Tableau principal');
    expect(bracket.matchCountLabel).toBe('1 match');
    expect(qualifying.label).toBe('Qualifications');
    expect(qualifying.matchCountLabel).toBe('2 matchs');
  });

  it('only lets the drawn rounds be edited, and none once corrections are closed', () => {
    const open = buildRoundHistoryViews(SESSIONS, 'standard', true, '');
    const closed = buildRoundHistoryViews(SESSIONS, 'standard', false, '');

    expect(open.map((view) => view.editable)).toEqual([false, true]);
    expect(closed.map((view) => view.editable)).toEqual([false, false]);
  });

  it('labels up-down rounds as drawn or by ranking', () => {
    const upDown = [
      session(1, SessionStatus.CLOSED, true, [match('a', 'A', 'B')]),
      session(2, SessionStatus.CLOSED, false, [match('b', 'A', 'B')]),
    ];

    expect(buildRoundHistoryViews(upDown, 'up_down', true, '').map((view) => view.label)).toEqual([
      'Au classement',
      'Tirage au sort',
    ]);
  });

  it('keeps only the matches and rounds of the searched team, accents and case ignored', () => {
    const views = buildRoundHistoryViews(SESSIONS, 'standard', true, 'equipe 7');

    expect(views.map((view) => view.sessionNumber)).toEqual([2, 1]);
    expect(views[1].groups.flatMap((group) => group.matches).map((m) => m.id)).toEqual(['m2']);
    expect(buildRoundHistoryViews(SESSIONS, 'standard', true, 'inconnue')).toEqual([]);
  });
});
