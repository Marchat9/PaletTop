import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { Nullable } from 'src/app/models/nullable.model';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  buildPdfFooter,
  buildTournamentPdfHeader,
  PDF_PAGE_MARGINS,
  PDF_STYLES,
  PDF_TABLE_LAYOUT,
  pdfFileSlug,
} from './tournament-pdf.util';

export interface PdfMatchGroup {
  /** Pool or bracket name; null when the round has a single unnamed group. */
  label: Nullable<string>;
  matches: SessionMatchDto[];
}

export interface PdfMatchRound {
  sessionNumber: number;
  /** Phase of the round: « Qualifications », « Tableau principal »… */
  label: string;
  groups: PdfMatchGroup[];
}

function matchRow(match: SessionMatchDto): TableCell[] {
  if (match.isBye) {
    return [
      { text: '—', alignment: 'center' },
      match.teamA.name,
      { text: 'Exempté', italics: true, alignment: 'center', color: '#666666' },
      '',
    ];
  }
  const winnerA = match.scoreA > match.scoreB;
  const winnerB = match.scoreB > match.scoreA;
  return [
    { text: `${match.plateNumber ?? ''}`, alignment: 'center' },
    { text: match.teamA.name, bold: winnerA },
    { text: `${match.scoreA} – ${match.scoreB}`, bold: true, alignment: 'center' },
    { text: match.teamB?.name ?? '', bold: winnerB, alignment: 'right' },
  ];
}

function groupTable(group: PdfMatchGroup): Content[] {
  const header: TableCell[] = [
    { text: 'Plaque', style: 'tableHeader', alignment: 'center' },
    { text: 'Équipe', style: 'tableHeader' },
    { text: 'Score', style: 'tableHeader', alignment: 'center' },
    { text: 'Équipe', style: 'tableHeader', alignment: 'right' },
  ];
  return [
    ...(group.label ? [{ text: group.label, style: 'groupTitle' }] : []),
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [44, '*', 64, '*'],
        body: [header, ...group.matches.map(matchRow)],
      },
      layout: PDF_TABLE_LAYOUT,
      margin: [0, 0, 0, 10],
    },
  ];
}

export function matchesPdfFileName(tournament: TournamentDto): string {
  return `matchs-${pdfFileSlug(tournament.name)}.pdf`;
}

/** A4 list of every match, round after round, each round grouped by pool or bracket. */
export function buildMatchesPdf(
  tournament: TournamentDto,
  rounds: PdfMatchRound[],
  appUrl: string,
): TDocumentDefinitions {
  const ordered = [...rounds].sort((a, b) => a.sessionNumber - b.sessionNumber);
  return {
    info: { title: `Matchs · ${tournament.name}` },
    pageSize: 'A4',
    pageMargins: PDF_PAGE_MARGINS,
    defaultStyle: { fontSize: 10 },
    styles: {
      ...PDF_STYLES,
      roundTitle: { fontSize: 14, bold: true, margin: [0, 8, 0, 6] },
      groupTitle: { fontSize: 10, bold: true, color: '#7a5400', margin: [0, 2, 0, 4] },
    },
    footer: buildPdfFooter(tournament.name),
    content: [
      ...buildTournamentPdfHeader({
        tournamentName: tournament.name,
        tournamentCode: tournament.code,
        appUrl,
        spectatorUrl: `${appUrl}/spectateur/${tournament.code}`,
        subtitle: 'Tous les matchs',
      }),
      ...ordered.flatMap((round) => [
        {
          text: `Round ${round.sessionNumber} · ${round.label}`,
          style: 'roundTitle',
          // Never leave a round title alone at the bottom of a page.
          headlineLevel: 1,
        } as Content,
        ...round.groups.flatMap(groupTable),
      ]),
    ],
    pageBreakBefore: (current, nodes) =>
      current.headlineLevel === 1 && nodes.getFollowingNodesOnPage().length === 0,
  };
}
