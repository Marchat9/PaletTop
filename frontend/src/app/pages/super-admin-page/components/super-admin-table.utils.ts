// Pure helpers shared by the super admin tournament and club tables — selection
// tracking and sort-state derivation are identical between the two, only the
// sortable-column type differs (kept generic here rather than duplicated).

export interface SuperAdminTableSortState<TColumn extends string> {
  column: TColumn;
  indicator: '▲' | '▼';
}

export function computeTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pruneSelection(selected: Set<string>, currentIds: readonly string[]): Set<string> {
  const currentSet = new Set(currentIds);
  const pruned = new Set([...selected].filter((id) => currentSet.has(id)));
  return pruned.size === selected.size ? selected : pruned;
}

export function toggleSelection(selected: Set<string>, id: string, checked: boolean): Set<string> {
  const next = new Set(selected);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
}

export function selectAll(itemIds: readonly string[], checked: boolean): Set<string> {
  return checked ? new Set(itemIds) : new Set();
}

export function computeSortState<TColumn extends string>(
  sortBy: TColumn,
  sortDir: 'ASC' | 'DESC',
): SuperAdminTableSortState<TColumn> {
  return { column: sortBy, indicator: sortDir === 'ASC' ? '▲' : '▼' };
}

export function nextSortDirection<TColumn extends string>(
  currentSortBy: TColumn,
  currentSortDir: 'ASC' | 'DESC',
  targetColumn: TColumn,
): 'ASC' | 'DESC' {
  return currentSortBy === targetColumn && currentSortDir === 'ASC' ? 'DESC' : 'ASC';
}
