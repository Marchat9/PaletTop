import {
  buildImportBlockReason,
  buildImportSummaryMessage,
  classifyImportRows,
  computeImportCapacity,
  countImportRows,
  filterImportRows,
  pickImportFile,
  toImportPayload,
} from './team-import.utils';
import { ParsedTeamRow } from './team-excel.utils';

function row(rowIndex: number, overrides: Partial<ParsedTeamRow> = {}): ParsedTeamRow {
  return {
    rowIndex,
    players: [{ name: `Joueur ${rowIndex}` }],
    errors: [],
    warnings: [],
    ...overrides,
  };
}

describe('team import helpers', () => {
  it('classifies error rows as ignored and warning rows as warning', () => {
    const views = classifyImportRows(
      [row(2), row(3, { warnings: ['w'] }), row(4, { errors: ['e'], players: [] })],
      0,
    );
    const byIndex = new Map(views.map((v) => [v.row.rowIndex, v.status]));
    expect(byIndex.get(2)).toBe('ready');
    expect(byIndex.get(3)).toBe('warning');
    expect(byIndex.get(4)).toBe('ignored');
  });

  it('sorts ignored first, then warnings, then ready rows by rowIndex', () => {
    const views = classifyImportRows(
      [row(2), row(3, { warnings: ['w'] }), row(4, { errors: ['e'] }), row(5), row(6, { errors: ['e'] })],
      0,
    );
    expect(views.map((v) => v.row.rowIndex)).toEqual([4, 6, 3, 2, 5]);
  });

  it('numbers auto names over importable rows only', () => {
    const views = classifyImportRows([row(2), row(3, { errors: ['e'] }), row(4)], 10);
    const names = views.map((v) => [v.row.rowIndex, v.displayName]);
    expect(names).toContainEqual([2, 'Équipe 11']);
    expect(names).toContainEqual([4, 'Équipe 12']);
    expect(views[0].status).toBe('ignored');
    expect(views[0].displayName).toBe('Ligne 3');
  });

  it('uses the provided team name when present', () => {
    const [view] = classifyImportRows([row(2, { name: 'Les As' })], 0);
    expect(view.displayName).toBe('Les As');
  });

  it('filters and counts rows', () => {
    const views = classifyImportRows(
      [row(2), row(3, { warnings: ['w'] }), row(4, { errors: ['e'] })],
      0,
    );
    expect(filterImportRows(views, 'all')).toHaveLength(3);
    expect(filterImportRows(views, 'warning').map((v) => v.row.rowIndex)).toEqual([3]);
    expect(countImportRows(views)).toEqual({
      all: 3,
      ready: 1,
      warning: 1,
      ignored: 1,
      importable: 2,
    });
  });

  it('keeps warning rows in the payload and drops error rows', () => {
    const payload = toImportPayload([
      row(2, { name: 'A' }),
      row(3, { warnings: ['w'] }),
      row(4, { errors: ['e'] }),
    ]);
    expect(payload).toHaveLength(2);
    expect(payload[0]).toEqual({ name: 'A', players: [{ name: 'Joueur 2' }] });
  });

  it('blocks when capacity is exceeded', () => {
    const capacity = computeImportCapacity(29, 14, 32);
    expect(capacity.exceeds).toBe(true);
    expect(capacity.remaining).toBe(3);
    const counts = { all: 14, ready: 14, warning: 0, ignored: 0, importable: 14 };
    expect(buildImportBlockReason(counts, capacity)).toBe(
      '14 équipes à importer, 3 places restantes (29 / 32).',
    );
  });

  it('allows exactly the remaining places', () => {
    expect(computeImportCapacity(10, 246, 256).exceeds).toBe(false);
    expect(computeImportCapacity(10, 247, 256).exceeds).toBe(true);
  });

  it('falls back to 256 when max is 0', () => {
    const capacity = computeImportCapacity(10, 247, 0);
    expect(capacity.max).toBe(256);
    expect(capacity.exceeds).toBe(true);
  });

  it('blocks when nothing is importable', () => {
    const counts = { all: 2, ready: 0, warning: 0, ignored: 2, importable: 0 };
    expect(buildImportBlockReason(counts, computeImportCapacity(0, 0, 32))).toBe(
      'Aucune équipe à importer.',
    );
  });

  it('does not block a valid import', () => {
    const counts = { all: 2, ready: 2, warning: 0, ignored: 0, importable: 2 };
    expect(buildImportBlockReason(counts, computeImportCapacity(0, 2, 32))).toBeNull();
  });

  it('builds the summary message', () => {
    expect(buildImportSummaryMessage(13, 0)).toBe('13 équipes importées');
    expect(buildImportSummaryMessage(13, 1)).toBe('13 équipes importées · 1 ligne ignorée');
    expect(buildImportSummaryMessage(1, 2)).toBe('1 équipe importée · 2 lignes ignorées');
  });

  it('picks the first accepted file', () => {
    const pdf = new File([''], 'a.pdf');
    const xlsx = new File([''], 'b.XLSX');
    expect(pickImportFile([pdf, xlsx], '.xlsx,.xls')).toBe(xlsx);
    expect(pickImportFile([pdf], '.xlsx')).toBeNull();
    expect(pickImportFile([], '.xlsx')).toBeNull();
  });
});
