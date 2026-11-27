import { LiveMatchView, SpectatorPhase } from 'src/app/models/live-match.model';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { SpectatorBadge } from 'src/app/shared/spectator-header/spectator-header.model';
import { computeMatchGroups } from 'src/app/utils/match-groups.util';
import { TrainingMatchDto } from 'src/app/store/training/training.models';
import { teamLabel } from 'src/app/utils/training-team.util';

/** What the spectator phase is deduced from. */
export interface SpectatorPhaseSource {
  /** The tournament has left its draft / the session has a round. */
  started: boolean;
  /** The tournament is completed or cancelled / the session is closed. */
  finished: boolean;
  /** Statuses of the matches of the current round. */
  matchStatuses: string[];
}

/** Matches being played first, then those awaiting validation, waiting and validated ones. */
const BOARD_ORDER = ['ONGOING', 'ENDED', 'PENDING', 'VALIDATED'];

/**
 * Nothing in the data says « between two rounds »: the current round is closed only when the next
 * one opens. A round whose matches are all validated is that moment.
 */
export function spectatorPhase(source: SpectatorPhaseSource): SpectatorPhase {
  if (source.finished) {
    return 'finished';
  }
  if (!source.started) {
    return 'waiting';
  }
  const allValidated =
    source.matchStatuses.length > 0 &&
    source.matchStatuses.every((status) => status === 'VALIDATED');
  return allValidated ? 'break' : 'live';
}

/**
 * Matches actually played in a round: a bye stays on the board but is not a match, and a training
 * bye is never validated, so counting it would keep the round open forever.
 */
export function playedMatches<T extends { isBye: boolean }>(matches: T[]): T[] {
  return matches.filter((match) => !match.isBye);
}

function boardRank(status: string): number {
  const index = BOARD_ORDER.indexOf(status);
  return index < 0 ? BOARD_ORDER.length : index;
}

/** Sorted by status for the spectator board; matches of the same status keep their order. */
export function orderForBoard(matches: LiveMatchView[]): LiveMatchView[] {
  return matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => boardRank(a.match.status) - boardRank(b.match.status) || a.index - b.index)
    .map(({ match }) => match);
}

/** Matches of a tournament round, in the order of their pools and brackets. */
export function toTournamentLiveMatches(matches: SessionMatchDto[]): LiveMatchView[] {
  return computeMatchGroups(matches).flatMap((group) =>
    group.matches.map((match) => ({
      id: match.id,
      status: match.status,
      isBye: match.isBye,
      byeWin: !!match.byeWin,
      plateNumber: match.plateNumber,
      groupLabel: group.label,
      teamA: match.teamA.name,
      teamB: match.teamB?.name ?? null,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
    })),
  );
}

/** Matches of a training round: an ephemeral team is named after its players. */
export function toTrainingLiveMatches(matches: TrainingMatchDto[]): LiveMatchView[] {
  return matches.map((match) => ({
    id: match.id,
    status: match.status,
    isBye: match.isBye,
    isRest: match.isBye,
    plateNumber: match.plateNumber ?? null,
    groupLabel: null,
    teamA: teamLabel(match.teamA),
    teamB: match.teamB ? teamLabel(match.teamB) : null,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    startedAt: match.startedAt ?? null,
    finishedAt: match.finishedAt ?? null,
  }));
}

/** Progress of the current round, during it or once all its matches are validated. */
export function spectatorRoundBadge(
  phase: SpectatorPhase,
  roundNumber: Nullable<number>,
  validatedCount: number,
  matchCount: number,
): Nullable<SpectatorBadge> {
  const round = `Round ${roundNumber ?? '-'}`;
  switch (phase) {
    case 'live':
      return {
        label: `${round} · ${validatedCount} / ${matchCount} matchs validés`,
        tone: 'neutral',
      };
    case 'break':
      return { label: `${round} · terminé`, tone: 'success' };
    default:
      return null;
  }
}
