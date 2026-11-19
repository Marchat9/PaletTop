import {
  AdminMatchGroup,
  AdminMatchView,
  AdminRoundHistory,
} from 'src/app/models/admin-match.model';
import {
  MATCH_GROUP_LABELS,
  MatchesSessionDto,
  MatchPoolGroup,
  SessionStatus,
} from 'src/app/models/matches-session.model';
import {
  CompetitionMode,
  UpDownTournamentConfig,
} from 'src/app/models/tournament-configuration-detail.model';
import { TrainingRoundDto } from 'src/app/store/training/training.models';
import {
  computeMatchGroups,
  toAdminMatchView,
  toTrainingAdminMatchGroups,
} from 'src/app/utils/match-groups.util';

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

/** Up-down round paired by results: every round after the first in Dutch mode, but the last by ranking. */
function isSwissRound(
  session: MatchesSessionDto,
  config: UpDownTournamentConfig | undefined,
): boolean {
  const isRankingRound =
    !!config?.lastRoundByRanking && session.sessionNumber === config.numberOfRound;
  return config?.pairingMode === 'dutch' && !session.isDrawnRound && !isRankingRound;
}

function roundLabel(
  session: MatchesSessionDto,
  mode: CompetitionMode,
  upDownConfig: UpDownTournamentConfig | undefined,
): string {
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
      if (session.isDrawnRound) {
        return 'Tirage au sort';
      }
      return isSwissRound(session, upDownConfig) ? 'Système suisse' : 'Au classement';
    case 'championship':
      return 'Championnat';
    default:
      return 'Qualifications';
  }
}

function matchCountLabel(count: number): string {
  return count > 1 ? `${count} matchs` : `${count} match`;
}

/** Closed rounds of a tournament, most recent first, with their matches grouped like the current round. */
export function buildRoundHistoryViews(
  sessions: MatchesSessionDto[],
  mode: CompetitionMode,
  canEdit: boolean,
  upDownConfig?: UpDownTournamentConfig,
): RoundHistoryView[] {
  return sessions
    .filter((session) => session.status === SessionStatus.CLOSED)
    .sort((a, b) => b.sessionNumber - a.sessionNumber)
    .map((session) => ({
      id: session.id,
      sessionNumber: session.sessionNumber,
      label: roundLabel(session, mode, upDownConfig),
      matchCountLabel: matchCountLabel(session.matches.filter((match) => !match.isBye).length),
      editable: canEdit && session.isDrawnRound,
      groups: computeMatchGroups(session.matches),
    }));
}

/** The closed rounds of a tournament, as the shared rounds history lists them. */
export function toTournamentRoundHistories(
  sessions: MatchesSessionDto[],
  mode: CompetitionMode,
  canEdit: boolean,
  upDownConfig?: UpDownTournamentConfig,
): AdminRoundHistory[] {
  return buildRoundHistoryViews(sessions, mode, canEdit, upDownConfig).map((view) => ({
    id: view.id,
    roundNumber: view.sessionNumber,
    label: view.label,
    matchCountLabel: view.matchCountLabel,
    editable: view.editable,
    groups: view.groups.map((group) => ({
      label: group.label,
      matches: group.matches.map(toAdminMatchView),
    })),
  }));
}

/**
 * Previous rounds of a training session, most recent first. Their scores stay correctable while the
 * session is open (the backend then only takes a final score).
 */
export function toTrainingRoundHistories(
  rounds: TrainingRoundDto[],
  canEdit: boolean,
): AdminRoundHistory[] {
  return [...rounds]
    .sort((a, b) => b.roundNumber - a.roundNumber)
    .map((round) => ({
      id: round.id,
      roundNumber: round.roundNumber,
      label: null,
      matchCountLabel: matchCountLabel(round.matches.filter((match) => !match.isBye).length),
      editable: canEdit,
      groups: toTrainingAdminMatchGroups(round.matches),
    }));
}

function matchesSearch(match: AdminMatchView, query: string): boolean {
  return normalize(match.teamA).includes(query) || normalize(match.teamB ?? '').includes(query);
}

/**
 * Keeps only the matches of the teams whose name contains the search (accents and case ignored)
 * and the rounds that still have one.
 */
export function filterRoundHistories(
  rounds: AdminRoundHistory[],
  search: string,
): AdminRoundHistory[] {
  const query = normalize(search);
  if (!query) {
    return rounds;
  }
  return rounds
    .map((round) => ({
      ...round,
      groups: round.groups
        .map((group): AdminMatchGroup => ({
          ...group,
          matches: group.matches.filter((match) => matchesSearch(match, query)),
        }))
        .filter((group) => group.matches.length > 0),
    }))
    .filter((round) => round.groups.length > 0);
}
