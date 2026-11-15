import {
  MATCH_GROUP_LABELS,
  MatchesSessionDto,
  MatchPoolGroup,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import { CompetitionMode } from 'src/app/models/tournament-configuration-detail.model';
import { computeMatchGroups } from '../match-sessions-card/session-matches/session-matches.utils';

export interface RoundHistoryView {
  id: string;
  sessionNumber: number;
  /** Phase of the round: « Qualifications », « Tableau principal »… */
  label: string;
  matchCountLabel: string;
  /** Drawn round of a tournament still open to corrections: its scores can be edited. */
  editable: boolean;
  groups: MatchPoolGroup[];
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function roundLabel(session: MatchesSessionDto, mode: CompetitionMode): string {
  const brackets = [
    ...new Set(
      session.matches
        .filter((match) => match.group)
        .sort((a, b) => a.group!.order - b.group!.order)
        .map((match) => MATCH_GROUP_LABELS[match.group!.name]),
    ),
  ];
  if (brackets.length) {
    return brackets.join(' · ');
  }
  switch (mode) {
    case 'up_down':
      return session.isDrawnRound ? 'Tirage au sort' : 'Au classement';
    case 'championship':
      return 'Championnat';
    default:
      return 'Qualifications';
  }
}

function matchCountLabel(count: number): string {
  return count > 1 ? `${count} matchs` : `${count} match`;
}

/**
 * Closed rounds, most recent first, with their matches grouped like the current round. A search
 * keeps only the matches of the teams whose name contains it (accents and case ignored) and the
 * rounds that still have one.
 */
export function buildRoundHistoryViews(
  sessions: MatchesSessionDto[],
  mode: CompetitionMode,
  canEdit: boolean,
  search: string,
): RoundHistoryView[] {
  const query = normalize(search);
  return sessions
    .filter((session) => session.status === SessionStatus.CLOSED)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)
    .map((session) => {
      const matches = query
        ? session.matches.filter(
            (match) =>
              normalize(match.teamA.name).includes(query) ||
              normalize(match.teamB?.name ?? '').includes(query),
          )
        : session.matches;
      return {
        id: session.id,
        sessionNumber: session.sessionNumber,
        label: roundLabel(session, mode),
        matchCountLabel: matchCountLabel(session.matches.filter((match) => !match.isBye).length),
        editable: canEdit && session.isDrawnRound,
        groups: computeMatchGroups(matches),
      };
    })
    .filter((round) => !query || round.groups.length > 0);
}
