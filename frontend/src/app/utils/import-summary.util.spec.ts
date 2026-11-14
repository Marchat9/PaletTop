import { buildImportSummaryMessage } from './import-summary.util';

describe('buildImportSummaryMessage', () => {
  it('builds the summary message', () => {
    expect(buildImportSummaryMessage(13, 0)).toBe('13 équipes importées');
    expect(buildImportSummaryMessage(13, 1)).toBe('13 équipes importées · 1 ligne ignorée');
    expect(buildImportSummaryMessage(1, 2)).toBe('1 équipe importée · 2 lignes ignorées');
  });
});
