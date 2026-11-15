import {
  generateTeamsExcelTemplate,
  getTemplateHeaders,
  parseTeamsExcelFile,
} from './team-excel.utils';

describe('team Excel import', () => {
  // exceljs and xlsx are lazy-loaded: their first import alone takes several seconds.
  it('reads back the clubs of the downloaded template unchanged', { timeout: 60_000 }, async () => {
    const template = await generateTeamsExcelTemplate(2);
    const file = new File([await template.arrayBuffer()], 'modele.xlsx');

    const result = await parseTeamsExcelFile(file, {
      maxPlayersPerTeam: 12,
      maxTeamsPerImport: 256,
    });

    expect(result.globalError).toBeFalsy();
    expect(result.rows[0].players[0]).toEqual({
      name: 'Jean Dupont (exemple)',
      club: 'Club des Exemples',
    });
  });

  it('returns found headers when no player column is detected', { timeout: 60_000 }, async () => {
    const { utils, write } = await import('xlsx');
    const sheet = utils.aoa_to_sheet([
      ['Equipe', 'Truc'],
      ['A', 'B'],
    ]);
    const book = utils.book_new();
    utils.book_append_sheet(book, sheet, 'S');
    const data = write(book, { type: 'array', bookType: 'xlsx' });
    const file = new File([data], 'x.xlsx');

    const result = await parseTeamsExcelFile(file, {
      maxPlayersPerTeam: 12,
      maxTeamsPerImport: 256,
    });

    expect(result.globalError).toContain('Nom Joueur N');
    expect(result.foundHeaders).toEqual(['Equipe', 'Truc']);
  });

  it('lists the template headers', () => {
    expect(getTemplateHeaders(2)).toEqual([
      'Nom Équipe (optionnel)',
      'Nom Joueur 1',
      'Nom Club 1',
      'Nom Joueur 2',
      'Nom Club 2',
    ]);
  });
});
