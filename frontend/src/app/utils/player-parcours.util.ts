import {
  MatchesSessionDto,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';

/** Where a team stands on one step of its way through the tournament. */
export type PlayerParcoursState = 'done' | 'current';

export interface PlayerParcoursStep {
  key: string;
  state: PlayerParcoursState;
  text: string;
}

interface TeamRound {
  session: MatchesSessionDto;
  match: SessionMatchDto;
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count > 1 ? 's' : ''}`;
}

function matchOf(session: MatchesSessionDto, teamId: string): SessionMatchDto | undefined {
  return session.matches.find((match) => match.teamA.id === teamId || match.teamB?.id === teamId);
}

function isElimination(session: MatchesSessionDto): boolean {
  return session.matches.some((match) => match.group);
}

/** The score of a match from the side of the team. */
function scoreOf(match: SessionMatchDto, teamId: string): { own: number; other: number } {
  return match.teamA.id === teamId
    ? { own: match.scoreA, other: match.scoreB }
    : { own: match.scoreB, other: match.scoreA };
}

function qualifyingSummary(rounds: TeamRound[], teamId: string): string {
  let wins = 0;
  let losses = 0;
  for (const { session, match } of rounds) {
    if (session.status !== SessionStatus.CLOSED) continue;
    if (match.isBye) {
      wins += match.byeWin ? 1 : 0;
      continue;
    }
    const { own, other } = scoreOf(match, teamId);
    if (own > other) wins++;
    else if (own < other) losses++;
  }
  return [wins > 0 ? plural(wins, 'victoire') : null, losses > 0 ? plural(losses, 'défaite') : null]
    .filter((part) => part !== null)
    .join(', ');
}

/** Wording of the drawn rounds: qualifiers in a structured tournament, plain matches otherwise. */
interface DrawnRoundsWording {
  current: (sessionNumber: number) => string;
  done: string;
  finished: string;
}

const QUALIFYING_WORDING: DrawnRoundsWording = {
  current: (sessionNumber) => `Qualifs : partie ${sessionNumber} en cours`,
  done: 'Qualifs',
  finished: 'terminées',
};

const MATCHES_WORDING: DrawnRoundsWording = {
  current: (sessionNumber) => `Match ${sessionNumber} en cours`,
  done: 'Matchs',
  finished: 'terminés',
};

function qualifyingStep(
  rounds: TeamRound[],
  teamId: string,
  wording: DrawnRoundsWording,
): PlayerParcoursStep[] {
  if (rounds.length === 0) {
    return [];
  }
  const summary = qualifyingSummary(rounds, teamId);
  const open = rounds.find(({ session }) => session.status === SessionStatus.OPEN);
  if (open) {
    const suffix = summary ? ` (${summary})` : '';
    return [
      {
        key: 'qualifying',
        state: 'current',
        text: `${wording.current(open.session.sessionNumber)}${suffix}`,
      },
    ];
  }
  return [
    { key: 'qualifying', state: 'done', text: `${wording.done} : ${summary || wording.finished}` },
  ];
}

function eliminationText(round: TeamRound, teamId: string, roundLabel: string): string {
  const { session, match } = round;
  const bracket = match.group!.label;
  if (match.isBye) {
    return `${roundLabel} · ${bracket} : exempt`;
  }
  if (session.status === SessionStatus.OPEN) {
    return `${roundLabel} · ${bracket} · plaque ${match.plateNumber ?? '—'}`;
  }
  const { own, other } = scoreOf(match, teamId);
  return `${roundLabel} · ${bracket} : ${own > other ? 'gagné' : 'perdu'} ${own}–${other}`;
}

function isLost(round: TeamRound, teamId: string): boolean {
  if (round.session.status !== SessionStatus.CLOSED || round.match.isBye) {
    return false;
  }
  const { own, other } = scoreOf(round.match, teamId);
  return own < other;
}

/**
 * The way of a team through the rounds already drawn: its qualifiers in one line, then one line per
 * elimination round it played, the one in progress last. A first-round bye reads « exempt ».
 * Only a structured tournament has qualifiers: the other modes count plain matches.
 */
export function computePlayerParcours(
  sessions: MatchesSessionDto[],
  teamId: string,
  hasQualifiers = true,
): PlayerParcoursStep[] {
  const ordered = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);
  const teamRounds = (list: MatchesSessionDto[]): TeamRound[] =>
    list.flatMap((session) => {
      const match = matchOf(session, teamId);
      return match ? [{ session, match }] : [];
    });

  const qualifyingSessions = ordered.filter((session) => !isElimination(session));
  const steps = qualifyingStep(
    teamRounds(qualifyingSessions),
    teamId,
    hasQualifiers ? QUALIFYING_WORDING : MATCHES_WORDING,
  );

  const eliminations = teamRounds(ordered.filter(isElimination));
  eliminations.forEach((round) => {
    const roundLabel = `Élim. ${round.session.sessionNumber - qualifyingSessions.length}`;
    steps.push({
      key: `elimination-${round.session.sessionNumber}`,
      state: round.session.status === SessionStatus.OPEN ? 'current' : 'done',
      text: eliminationText(round, teamId, roundLabel),
    });
  });
  return steps;
}
