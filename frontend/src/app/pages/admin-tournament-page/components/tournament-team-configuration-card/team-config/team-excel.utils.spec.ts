import { generateTeamsExcelTemplate, parseTeamsExcelFile } from './team-excel.utils';

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
});
