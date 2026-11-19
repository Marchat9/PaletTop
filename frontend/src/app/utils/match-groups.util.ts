import { AdminMatchGroup, AdminMatchView } from 'src/app/models/admin-match.model';
import {
  MATCH_GROUP_LABELS,
  MatchPoolGroup,
  SessionMatchDto,
} from 'src/app/models/matches-session.model';
import { TrainingMatchDto } from 'src/app/store/training/training.models';
import { teamLabel } from 'src/app/utils/training-team.util';

/** Matches of a tournament round by pool or bracket, each sorted by plate. */
export function computeMatchGroups(matches: SessionMatchDto[]): MatchPoolGroup[] {
  const sorted = [...matches].sort(
    (a, b) => (a.plateNumber ?? Infinity) - (b.plateNumber ?? Infinity),
  );

  const noGroupKey: string = 'no-group';
  const groupMap = new Map<string, MatchPoolGroup>();

  for (const match of sorted) {
    const key: string =
      match.group?.name ??
      (Number.isInteger(match.poolNumber) ? `Poule ${match.poolNumber}` : noGroupKey);

    const order: number =
      match.group?.order ??
      (Number.isInteger(match.poolNumber) ? match.poolNumber! : groupMap.size);

    const label: string | null = match.group
      ? MATCH_GROUP_LABELS[match.group.name]
      : key !== noGroupKey
        ? key
        : null;

    if (!groupMap.has(key)) {
      groupMap.set(key, { label, order, matches: [] });
    }
    groupMap.get(key)!.matches.push(match);
  }

  const groups = [...groupMap.values()].sort((a, b) => a.order - b.order);
  // A single pool is the whole round: its « Poule 1 » label says nothing.
  const isSinglePool = groups.length === 1 && !sorted[0]?.group;
  return isSinglePool ? [{ ...groups[0], label: null }] : groups;
}

export function toAdminMatchView(match: SessionMatchDto): AdminMatchView {
  return {
    id: match.id,
    status: match.status,
    isBye: match.isBye,
    byeWin: !!match.byeWin,
    plateNumber: match.plateNumber,
    teamA: match.teamA.name,
    teamB: match.teamB?.name ?? null,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
  };
}

/** Matches of a tournament round, by pool or bracket. */
export function toTournamentAdminMatchGroups(matches: SessionMatchDto[]): AdminMatchGroup[] {
  return computeMatchGroups(matches).map((group) => ({
    label: group.label,
    matches: group.matches.map(toAdminMatchView),
  }));
}

/** A training round has neither pools nor brackets: one group, by plate, byes last. */
export function toTrainingAdminMatchGroups(matches: TrainingMatchDto[]): AdminMatchGroup[] {
  if (matches.length === 0) {
    return [];
  }
  const sorted = [...matches].sort(
    (a, b) => (a.plateNumber ?? Infinity) - (b.plateNumber ?? Infinity),
  );
  return [
    {
      label: null,
      matches: sorted.map((match) => ({
        id: match.id,
        status: match.status,
        isBye: match.isBye,
        isRest: match.isBye,
        plateNumber: match.plateNumber ?? null,
        teamA: teamLabel(match.teamA),
        teamB: match.teamB ? teamLabel(match.teamB) : null,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        startedAt: match.startedAt ?? null,
        finishedAt: match.finishedAt ?? null,
      })),
    },
  ];
}
