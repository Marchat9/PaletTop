const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count > 1 ? pluralForm : singular}`;

/** Toast message shown once a team import is confirmed by the server. */
export function buildImportSummaryMessage(importedCount: number, ignoredCount: number): string {
  const imported = plural(importedCount, 'équipe importée', 'équipes importées');
  return ignoredCount > 0
    ? `${imported} · ${plural(ignoredCount, 'ligne ignorée', 'lignes ignorées')}`
    : imported;
}
