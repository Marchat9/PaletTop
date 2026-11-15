import type { ContentTable } from 'pdfmake/interfaces';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TounamentTeamDto, TournamentDto } from 'src/app/store/tournament/tournament.models';
import { buildPdfTeamRows, buildTeamListPdf, teamListPdfFileName } from './team-list-pdf.util';

const APP_URL = 'https://palettop.fr';

function team(name: string, code: string | null): TounamentTeamDto {
  return {
    id: name,
    code: code ?? undefined,
    name,
    players: [{ name: `${name} A` }, { name: `${name} B` }],
  } as TounamentTeamDto;
}

function tournament(teams: TounamentTeamDto[]): TournamentDto {
  return {
    id: 't1',
    code: 'OPEN',
    name: "Open d'Été 2026",
    date: new Date(),
    configuration: {
      maxTeamCapacity: 64,
      scoreCalculation: 'victory_ga',
      pointsPerGame: 13,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status: TournamentStatus.DRAFT,
    teams,
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

describe('buildPdfTeamRows', () => {
  it('sorts teams in natural order: « Equipe 2 » before « Equipe 11 »', () => {
    const rows = buildPdfTeamRows(
      tournament([team('Equipe 11', '1111'), team('Equipe 2', '2222'), team('Equipe 1', '0001')]),
      APP_URL,
    );

    expect(rows.map((row) => row.name)).toEqual(['Equipe 1', 'Equipe 2', 'Equipe 11']);
  });

  it('builds the join link from the tournament and team codes, none without a team code', () => {
    const rows = buildPdfTeamRows(tournament([team('Alpha', '1234'), team('Beta', null)]), APP_URL);

    expect(rows[0]).toEqual({
      name: 'Alpha',
      code: '1234',
      playerNames: 'Alpha A, Alpha B',
      playerUrl: 'https://palettop.fr/player/tournament/OPEN/1234',
    });
    expect(rows[1].playerUrl).toBe('');
  });
});

describe('buildTeamListPdf', () => {
  it('repeats the table header on every page and keeps each team on one page', () => {
    const document = buildTeamListPdf(tournament([team('Alpha', '1234')]), APP_URL);
    const content = document.content as unknown[];
    const table = content[content.length - 1] as ContentTable;

    expect(document.pageSize).toBe('A4');
    expect(table.table.headerRows).toBe(1);
    expect(table.table.dontBreakRows).toBe(true);
    expect(table.table.body).toHaveLength(2);
  });

  it('names the file after the tournament', () => {
    expect(teamListPdfFileName(tournament([]))).toBe('equipes-open-d-ete-2026.pdf');
  });
});
