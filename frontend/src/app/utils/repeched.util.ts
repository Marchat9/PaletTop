import {
  MatchesSessionDto,
  SessionMatchDto,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { groupOrder } from 'src/app/utils/group-order.util';

/** A team brought back to a bracket after losing its first round there. */
export interface RepechedTeam {
  teamId: string;
  teamName: string;
  /** Score of the lost match, own score first (« 10–11 »). */
  defeat: string;
  /** Points behind in the lost match: the closer the defeat, the better the loser. */
  margin: number;
}

/** The repêchés of one bracket. */
export interface BracketRepechedList {
  key: string;
  label: string;
  teams: RepechedTeam[];
}

/** A bracket whose first round is not a loss for anyone: challenges and the 3rd place match are out. */
const REPECHED_BRACKET_KEY = /^(principale|consolante_\d+)$/;

interface BracketRound {
  sessionNumber: number;
  matches: SessionMatchDto[];
}

function loserOf(match: SessionMatchDto): RepechedTeam | null {
  if (match.isBye || !match.teamB || match.scoreA === match.scoreB) {
    return null;
  }
  const aLost = match.scoreA < match.scoreB;
  const loser = aLost ? match.teamA : match.teamB;
  const own = aLost ? match.scoreA : match.scoreB;
  const other = aLost ? match.scoreB : match.scoreA;
  return { teamId: loser.id, teamName: loser.name, defeat: `${own}–${other}`, margin: other - own };
}

/**
 * Teams that lost their first match in a bracket and still play its next round: the best losers
 * brought back to fill it. Read from the played rounds, bracket by bracket, in the display order.
 */
export function computeRepechedByBracket(sessions: MatchesSessionDto[]): BracketRepechedList[] {
  const rounds = new Map<string, { label: string; rounds: BracketRound[] }>();
  for (const session of [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber)) {
    const byBracket = new Map<string, SessionMatchDto[]>();
    for (const match of session.matches) {
      const group = match.group;
      if (group && REPECHED_BRACKET_KEY.test(group.name)) {
        byBracket.set(group.name, [...(byBracket.get(group.name) ?? []), match]);
        rounds.set(group.name, rounds.get(group.name) ?? { label: group.label, rounds: [] });
      }
    }
    for (const [key, matches] of byBracket) {
      rounds.get(key)!.rounds.push({ sessionNumber: session.sessionNumber, matches });
    }
  }

  const closed = new Set(
    sessions.filter((s) => s.status === SessionStatus.CLOSED).map((s) => s.sessionNumber),
  );
  const lists: BracketRepechedList[] = [];
  for (const [key, bracket] of rounds) {
    const [first, second] = bracket.rounds;
    if (!first || !second || !closed.has(first.sessionNumber)) {
      continue;
    }
    const playingNext = new Set(
      second.matches.flatMap((match) => [match.teamA.id, match.teamB?.id ?? '']),
    );
    const teams = first.matches
      .map(loserOf)
      .filter((loser): loser is RepechedTeam => loser !== null && playingNext.has(loser.teamId))
      .sort((a, b) => a.margin - b.margin || a.teamName.localeCompare(b.teamName, 'fr'));
    if (teams.length > 0) {
      lists.push({ key, label: bracket.label, teams });
    }
  }
  return lists.sort((a, b) => groupOrder(a.key) - groupOrder(b.key));
}
