import type {
  Content,
  CustomTableLayout,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  buildPdfFooter,
  buildTournamentPdfHeader,
  PDF_PAGE_MARGINS,
  PDF_STYLES,
  PDF_TABLE_LAYOUT,
  pdfFileSlug,
} from './tournament-pdf.util';

// Capacities in single-line rows (9pt text): the first page also holds the tournament header.
// Kept below the measured fit so a few wrapped names never push a column onto the next page.
export const RANKING_FIRST_PAGE_ROWS = 34;
export const RANKING_PAGE_ROWS = 40;
/** A wrapped name adds a line of text, not a whole row (paddings and borders are shared). */
const EXTRA_LINE_WEIGHT = 0.65;
const COLUMN_GAP = 12;

interface RankingPdfStat {
  label: string;
  width: number;
  value: (entry: GlobalRankingEntry) => string;
}

interface RankingPdfMode {
  stats: RankingPdfStat[];
  /** Characters of a team name that fit on one line of a half-page column. */
  nameCharsPerLine: number;
  legend?: string;
}

function rankingPdfMode(scoreCalculation: ScoreCalculation | undefined): RankingPdfMode {
  switch (scoreCalculation) {
    case 'tournament_score':
      return {
        stats: [{ label: 'Pts Tournoi', width: 48, value: (entry) => `${entry.tournamentPoints}` }],
        nameCharsPerLine: 30,
      };
    case 'victory_goal_average':
    case 'victory_best_defeats':
    case 'victory_points_scored':
    default:
      return {
        stats: [
          { label: 'V', width: 20, value: (entry) => `${entry.wins}` },
          { label: 'D', width: 20, value: (entry) => `${entry.losses}` },
          {
            label: 'GA',
            width: 26,
            value: (entry) => `${entry.goalAverage > 0 ? '+' : ''}${entry.goalAverage}`,
          },
          {
            label: 'PP-PC',
            width: 42,
            value: (entry) => `${entry.pointsFor}-${entry.pointsAgainst}`,
          },
        ],
        nameCharsPerLine: 18,
        legend:
          'V = victoires · D = défaites · GA = Goal average · PP-PC = points pour - points contre',
      };
  }
}

function rowWeight(entry: GlobalRankingEntry, nameCharsPerLine: number): number {
  const lines = Math.max(1, Math.ceil(entry.teamName.length / nameCharsPerLine));
  return 1 + (lines - 1) * EXTRA_LINE_WEIGHT;
}

/**
 * Pages of up to two side-by-side columns, read top to bottom then left to right. A ranking
 * that fits one column of the first page stays a single full-width table.
 */
export function paginateRanking(
  entries: GlobalRankingEntry[],
  nameCharsPerLine: number,
): GlobalRankingEntry[][][] {
  const weights = entries.map((entry) => rowWeight(entry, nameCharsPerLine));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= RANKING_FIRST_PAGE_ROWS) {
    return [[entries]];
  }

  const pages: GlobalRankingEntry[][][] = [];
  let capacity = RANKING_FIRST_PAGE_ROWS;
  let page: GlobalRankingEntry[][] = [];
  let column: GlobalRankingEntry[] = [];
  let used = 0;

  entries.forEach((entry, index) => {
    if (column.length > 0 && used + weights[index] > capacity) {
      page.push(column);
      column = [];
      used = 0;
      if (page.length === 2) {
        pages.push(page);
        page = [];
        capacity = RANKING_PAGE_ROWS;
      }
    }
    column.push(entry);
    used += weights[index];
  });
  page.push(column);
  pages.push(page);
  return pages;
}

const COMPACT_TABLE_LAYOUT: CustomTableLayout = {
  ...PDF_TABLE_LAYOUT,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

function rankingTable(
  entries: GlobalRankingEntry[],
  mode: RankingPdfMode,
  compact: boolean,
): Content {
  const header: TableCell[] = [
    { text: '#', style: 'tableHeader' },
    { text: 'Équipe', style: 'tableHeader' },
    ...mode.stats.map((stat) => ({
      text: stat.label,
      style: 'tableHeader',
      alignment: 'right' as const,
    })),
  ];
  const rows: TableCell[][] = entries.map((entry) => [
    { text: `${entry.rank}`, bold: entry.rank <= 3 },
    { text: entry.teamName, bold: entry.rank <= 3 },
    ...mode.stats.map((stat) => ({ text: stat.value(entry), alignment: 'right' as const })),
  ]);

  return {
    fontSize: compact ? 9 : 10,
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [18, '*', ...mode.stats.map((stat) => stat.width)],
      body: [header, ...rows],
    },
    layout: compact ? COMPACT_TABLE_LAYOUT : PDF_TABLE_LAYOUT,
  };
}

export function rankingPdfFileName(tournament: TournamentDto): string {
  return `classement-${pdfFileSlug(tournament.name)}.pdf`;
}

/** A4 final ranking: the tournament header on the first page, then two columns per page when long. */
export function buildRankingPdf(
  tournament: TournamentDto,
  ranking: GlobalRankingEntry[],
  appUrl: string,
): TDocumentDefinitions {
  const mode = rankingPdfMode(tournament.configuration.scoreCalculation);
  const pages = paginateRanking(ranking, mode.nameCharsPerLine);
  const singleColumn = pages.length === 1 && pages[0].length === 1;

  const body: Content[] = singleColumn
    ? [rankingTable(ranking, mode, false)]
    : pages.map((columns, index) => ({
        columnGap: COLUMN_GAP,
        pageBreak: index > 0 ? 'before' : undefined,
        columns: [0, 1].map((side) =>
          columns[side] ? rankingTable(columns[side], mode, true) : { text: '' },
        ),
      }));

  return {
    info: { title: `Classement · ${tournament.name}` },
    pageSize: 'A4',
    pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: { fontSize: 10 },
    styles: PDF_STYLES,
    footer: buildPdfFooter(tournament.name),
    content: [
      ...buildTournamentPdfHeader({
        tournamentName: tournament.name,
        tournamentCode: tournament.code,
        appUrl,
        spectatorUrl: `${appUrl}/spectateur/${tournament.code}`,
        subtitle: 'Classement final',
      }),
      ...body,
      ...(mode.legend ? [{ text: mode.legend, style: 'legend' }] : []),
    ],
  };
}
