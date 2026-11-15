import type { ContentColumns, ContentTable } from 'pdfmake/interfaces';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  buildRankingPdf,
  paginateRanking,
  RANKING_FIRST_PAGE_ROWS,
  RANKING_PAGE_ROWS,
  rankingPdfFileName,
} from './ranking-pdf.util';

const APP_URL = 'https://palettop.fr';

function entries(count: number, name = (index: number) => `Equipe ${index}`): GlobalRankingEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    rank: index + 1,
    teamId: `team-${index + 1}`,
    teamName: name(index + 1),
    wins: 3,
    pointsFor: 39,
    pointsAgainst: 20,
    goalAverage: index === 0 ? 19 : -4,
    matchesPlayed: 3,
    tournamentPoints: 9,
  }));
}

function tournament(scoreCalculation: ScoreCalculation): TournamentDto {
  return {
    id: 't1',
    code: 'OPEN',
    name: 'Open 2026',
    date: new Date(),
    configuration: {
      maxTeamCapacity: 256,
      scoreCalculation,
      pointsPerGame: 13,
      rematch: false,
      matchAgainstFullSameClub: false,
      matchAgainstPartialSameClub: false,
      competitionMode: 'standard',
      competitionConfiguration: {},
    },
    status: TournamentStatus.FINISHED,
    teams: [],
    createdAt: new Date().toISOString(),
    tournamentStatus: null,
  };
}

function lastTable(content: unknown[]): ContentTable {
  return content.find(
    (block) => (block as ContentTable).table && content.indexOf(block) > 1,
  ) as ContentTable;
}

describe('paginateRanking', () => {
  it('keeps a short ranking as one full-width column', () => {
    expect(paginateRanking(entries(RANKING_FIRST_PAGE_ROWS), 24)).toEqual([
      [entries(RANKING_FIRST_PAGE_ROWS)],
    ]);
  });

  it('fills the first page left then right, then the next pages with more rows', () => {
    const total = RANKING_FIRST_PAGE_ROWS * 2 + RANKING_PAGE_ROWS + 5;
    const pages = paginateRanking(entries(total), 24);

    expect(pages.map((page) => page.map((column) => column.length))).toEqual([
      [RANKING_FIRST_PAGE_ROWS, RANKING_FIRST_PAGE_ROWS],
      [RANKING_PAGE_ROWS, 5],
    ]);
    expect(pages[0][1][0].rank).toBe(RANKING_FIRST_PAGE_ROWS + 1);
    expect(pages.flat(2)).toHaveLength(total);
  });

  it('gives fewer rows to a column whose team names wrap', () => {
    const longName = () => 'Les Palets Bretons de Saint-Malo et environs';
    const pages = paginateRanking(entries(RANKING_FIRST_PAGE_ROWS * 2, longName), 24);

    expect(pages[0][0].length).toBeLessThan(RANKING_FIRST_PAGE_ROWS);
  });
});

describe('buildRankingPdf', () => {
  it('shows victories, points and a signed goal average with its legend by default', () => {
    const document = buildRankingPdf(tournament('victory_ga'), entries(3), APP_URL);
    const content = document.content as unknown[];
    const table = lastTable(content);

    expect(table.table.body[0].map((cell) => (cell as { text: string }).text)).toEqual([
      '#',
      'Équipe',
      'V',
      'Pts+',
      'GA',
    ]);
    expect((table.table.body[1][4] as { text: string }).text).toBe('+19');
    expect((table.table.body[2][4] as { text: string }).text).toBe('-4');
    expect(content[content.length - 1]).toEqual(expect.objectContaining({ style: 'legend' }));
  });

  it('shows only the tournament points column in tournament score mode', () => {
    const table = lastTable(
      buildRankingPdf(tournament('tournament_score'), entries(2), APP_URL).content as unknown[],
    );

    expect(table.table.body[0].map((cell) => (cell as { text: string }).text)).toEqual([
      '#',
      'Équipe',
      'Pts Tournoi',
    ]);
  });

  it('shows the score then the signed goal average that breaks its ties in score mode', () => {
    const table = lastTable(
      buildRankingPdf(tournament('score'), entries(2), APP_URL).content as unknown[],
    );

    expect(table.table.body[0].map((cell) => (cell as { text: string }).text)).toEqual([
      '#',
      'Équipe',
      'Score',
      'GA',
    ]);
    expect((table.table.body[1][3] as { text: string }).text).toBe('+19');
  });

  it('lays a long ranking out in two columns with a page break before each extra page', () => {
    const content = buildRankingPdf(
      tournament('score'),
      entries(RANKING_FIRST_PAGE_ROWS * 2 + 1),
      APP_URL,
    ).content as unknown[];
    const pages = content.filter(
      (block) => (block as ContentColumns).columns && content.indexOf(block) > 1,
    );

    expect(pages).toHaveLength(2);
    expect((pages[1] as ContentColumns & { pageBreak: string }).pageBreak).toBe('before');
  });

  it('names the file after the tournament', () => {
    expect(rankingPdfFileName(tournament('score'))).toBe('classement-open-2026.pdf');
  });
});
