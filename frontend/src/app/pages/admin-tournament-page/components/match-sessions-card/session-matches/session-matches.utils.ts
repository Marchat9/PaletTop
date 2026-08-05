import {
  MATCH_GROUP_LABELS,
  MatchPoolGroup,
  SessionMatchDto,
} from 'src/app/models/matches-session.model';

export function computeMatchGroups(matches: SessionMatchDto[]) {
  const sorted = [...matches].sort(
    (a, b) => (a.plateNumber ?? Infinity) - (b.plateNumber ?? Infinity),
  );

  const groupMap = new Map<string, MatchPoolGroup>();
  for (const match of sorted) {
    const key: string =
      match.group?.name ??
      (Number.isInteger(match.poolNumber) ? `Poule ${match.poolNumber}` : 'no-group');
    const order: number =
      match.group?.order ??
      (Number.isInteger(match.poolNumber) ? match.poolNumber! : groupMap.size);
    const label: string = match.group ? MATCH_GROUP_LABELS[match.group.name] : key;

    if (!groupMap.has(key)) {
      groupMap.set(key, { label, order, matches: [] });
    }
    groupMap.get(key)!.matches.push(match);
  }

  return [...groupMap.values()].sort((a, b) => a.order - b.order);
}
