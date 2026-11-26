import {
  MatchesSessionDto,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { TrainingMatchDto, TrainingRoundDto } from 'src/app/store/training/training.models';
import {
  buildRoundHistoryViews,
  filterRoundHistories,
  toTournamentRoundHistories,
  toTrainingRoundHistories,
} from './rounds-history.util';

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
      group: { order: 1, name: 'principale', label: 'Principale' },
      poolNumber: null,
    }),
  ]),
  session(3, SessionStatus.OPEN, false, [match('m4', 'Les Galets', 'Breizh Palet')]),
];

describe('buildRoundHistoryViews', () => {
  it('lists the closed rounds only, most recent first', () => {
    const views = buildRoundHistoryViews(SESSIONS, 'standard', true);

    expect(views.map((view) => view.sessionNumber)).toEqual([2, 1]);
  });

  it('names the phase and counts the played matches, byes left out', () => {
    const [bracket, qualifying] = buildRoundHistoryViews(SESSIONS, 'standard', true);

    expect(bracket.label).toBe('Principale');
    expect(bracket.matchCountLabel).toBe('1 match');
    expect(qualifying.label).toBe('Qualifications');
    expect(qualifying.matchCountLabel).toBe('2 matchs');
  });

  it('only lets the drawn rounds be edited, and none once corrections are closed', () => {
    const open = buildRoundHistoryViews(SESSIONS, 'standard', true);
    const closed = buildRoundHistoryViews(SESSIONS, 'standard', false);

    expect(open.map((view) => view.editable)).toEqual([false, true]);
    expect(closed.map((view) => view.editable)).toEqual([false, false]);
  });

  it('labels up-down rounds as drawn or by ranking', () => {
    const upDown = [
      session(1, SessionStatus.CLOSED, true, [match('a', 'A', 'B')]),
      session(2, SessionStatus.CLOSED, false, [match('b', 'A', 'B')]),
    ];

    expect(buildRoundHistoryViews(upDown, 'up_down', true).map((view) => view.label)).toEqual([
      'Au classement',
      'Tirage au sort',
    ]);
  });

  it('labels the up-down rounds paired by results Gagnant/Perdant, the frozen one apart', () => {
    const dutch = [
      session(1, SessionStatus.CLOSED, true, [match('a', 'A', 'B')]),
      session(2, SessionStatus.CLOSED, false, [match('b', 'A', 'B')]),
      session(3, SessionStatus.CLOSED, false, [match('c', 'A', 'B')]),
    ];
    const config = { pairingMode: 'dutch' as const, numberOfRound: 3, lastRoundByRanking: true };

    expect(
      buildRoundHistoryViews(dutch, 'up_down', true, config).map((view) => view.label),
    ).toEqual(['Dernière partie figée', 'Gagnant/Perdant', 'Tirage au sort']);
  });

  it('labels the neighbour rounds Voisins de classement', () => {
    const neighbors = [
      session(1, SessionStatus.CLOSED, true, [match('a', 'A', 'B')]),
      session(2, SessionStatus.CLOSED, false, [match('b', 'A', 'B')]),
    ];
    const config = { pairingMode: 'neighbors' as const, numberOfRound: 4 };

    expect(
      buildRoundHistoryViews(neighbors, 'up_down', true, config).map((view) => view.label),
    ).toEqual(['Voisins de classement', 'Tirage au sort']);
  });

  it('keeps only the matches and rounds of the searched team, accents and case ignored', () => {
    const rounds = toTournamentRoundHistories(SESSIONS, 'standard', true);
    const views = filterRoundHistories(rounds, 'equipe 7');

    expect(views.map((view) => view.roundNumber)).toEqual([2, 1]);
    expect(views[1].groups.flatMap((group) => group.matches).map((m) => m.id)).toEqual(['m2']);
    expect(filterRoundHistories(rounds, 'inconnue')).toEqual([]);
  });
});

function trainingMatch(id: string, plateNumber: number | null, isBye = false): TrainingMatchDto {
  return {
    id,
    status: 'VALIDATED',
    isBye,
    plateNumber,
    teamA: { id: `${id}-a`, kind: 'EPHEMERAL', members: [{ id: 'p1', name: 'Alice' }] },
    teamB: isBye
      ? null
      : { id: `${id}-b`, kind: 'FIXED', name: 'Les Laitons', members: [{ id: 'p2', name: 'Bob' }] },
    scoreA: 13,
    scoreB: 4,
  };
}

describe('toTrainingRoundHistories', () => {
  const rounds: TrainingRoundDto[] = [
    { id: 'r1', roundNumber: 1, status: 'CLOSED', matches: [trainingMatch('a', 1)] },
    {
      id: 'r2',
      roundNumber: 2,
      status: 'CLOSED',
      matches: [trainingMatch('bye', null, true), trainingMatch('c', 2), trainingMatch('b', 1)],
    },
  ];

  it('lists the rounds most recent first, without phase label', () => {
    const views = toTrainingRoundHistories(rounds, true);

    expect(views.map((view) => view.roundNumber)).toEqual([2, 1]);
    expect(views.every((view) => view.label === null)).toBe(true);
    expect(views[0].matchCountLabel).toBe('2 matchs');
  });

  it('orders the matches by the plate given by the backend, byes last, teams by their label', () => {
    const [latest] = toTrainingRoundHistories(rounds, true);
    const matches = latest.groups[0].matches;

    expect(matches.map((match) => match.id)).toEqual(['b', 'c', 'bye']);
    expect(matches[0].teamA).toBe('Alice');
    expect(matches[0].teamB).toBe('Les Laitons');
  });

  it('keeps the scores correctable only while the session is open', () => {
    expect(toTrainingRoundHistories(rounds, true).every((view) => view.editable)).toBe(true);
    expect(toTrainingRoundHistories(rounds, false).some((view) => view.editable)).toBe(false);
  });
});
