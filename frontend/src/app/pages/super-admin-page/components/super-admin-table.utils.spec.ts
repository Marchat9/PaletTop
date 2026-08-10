import {
  computeSortState,
  computeTotalPages,
  nextSortDirection,
  pruneSelection,
  selectAll,
  toggleSelection,
} from './super-admin-table.utils';

describe('computeTotalPages', () => {
  it('rounds up and never returns less than 1', () => {
    expect(computeTotalPages(45, 20)).toBe(3);
    expect(computeTotalPages(0, 20)).toBe(1);
    expect(computeTotalPages(20, 20)).toBe(1);
  });
});

describe('pruneSelection', () => {
  it('removes ids no longer present in the current list', () => {
    const selected = new Set(['a', 'b', 'c']);
    expect(pruneSelection(selected, ['b', 'c', 'd'])).toEqual(new Set(['b', 'c']));
  });

  it('returns the same instance when nothing needs pruning', () => {
    const selected = new Set(['a', 'b']);
    expect(pruneSelection(selected, ['a', 'b', 'c'])).toBe(selected);
  });
});

describe('toggleSelection', () => {
  it('adds the id when checked', () => {
    expect(toggleSelection(new Set(['a']), 'b', true)).toEqual(new Set(['a', 'b']));
  });

  it('removes the id when unchecked', () => {
    expect(toggleSelection(new Set(['a', 'b']), 'a', false)).toEqual(new Set(['b']));
  });
});

describe('selectAll', () => {
  it('selects every id when checked', () => {
    expect(selectAll(['a', 'b', 'c'], true)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('clears the selection when unchecked', () => {
    expect(selectAll(['a', 'b', 'c'], false)).toEqual(new Set());
  });
});

describe('computeSortState', () => {
  it('returns an ascending arrow for ASC', () => {
    expect(computeSortState('name', 'ASC')).toEqual({ column: 'name', indicator: '▲' });
  });

  it('returns a descending arrow for DESC', () => {
    expect(computeSortState('name', 'DESC')).toEqual({ column: 'name', indicator: '▼' });
  });
});

describe('nextSortDirection', () => {
  it('toggles ASC to DESC on the same column', () => {
    expect(nextSortDirection('name', 'ASC', 'name')).toBe('DESC');
  });

  it('toggles DESC to ASC on the same column', () => {
    expect(nextSortDirection('name', 'DESC', 'name')).toBe('ASC');
  });

  it('resets to ASC on a new column', () => {
    expect(nextSortDirection('name', 'DESC', 'createdAt')).toBe('ASC');
  });
});
