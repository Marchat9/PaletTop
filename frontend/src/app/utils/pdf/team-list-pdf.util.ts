import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { compareNatural } from '../natural-compare.util';
import {
  buildPdfFooter,
  buildTournamentPdfHeader,
  PDF_PAGE_MARGINS,
  PDF_STYLES,
  PDF_TABLE_LAYOUT,
  pdfFileSlug,
  qrCodeSvg,
} from './tournament-pdf.util';

const JOIN_QR_SIZE = 45;

export interface PdfTeamRow {
  name: string;
  code: string;
  playerNames: string;
  /** Link that lets the team join from its phone; empty while the team has no code yet. */
  playerUrl: string;
}

/** Teams in natural name order (« Équipe 2 » before « Équipe 11 »), with their join link. */
export function buildPdfTeamRows(tournament: TournamentDto, appUrl: string): PdfTeamRow[] {
  return (tournament.teams ?? [])
    .map((team) => ({
      name: team.name,
      code: team.code ?? '',
      playerNames: team.players.map((player) => player.name).join(', '),
      playerUrl: team.code ? `${appUrl}/player/tournament/${tournament.code}/${team.code}` : '',
    }))
    .sort((a, b) => compareNatural(a.name, b.name));
}

export function teamListPdfFileName(tournament: TournamentDto): string {
  return `equipes-${pdfFileSlug(tournament.name)}.pdf`;
}

/** A4 team list: the tournament header on the first page, then the teams over as many pages as needed. */
export function buildTeamListPdf(tournament: TournamentDto, appUrl: string): TDocumentDefinitions {
  const header: TableCell[] = ['Équipe', 'Code', 'Joueurs', 'Rejoindre'].map((label) => ({
    text: label,
    style: 'tableHeader',
  }));
  const rows: TableCell[][] = buildPdfTeamRows(tournament, appUrl).map((team) => [
    team.name,
    { text: team.code, bold: true },
    team.playerNames,
    team.playerUrl
      ? { svg: qrCodeSvg(team.playerUrl, JOIN_QR_SIZE), width: JOIN_QR_SIZE, alignment: 'center' }
      : '',
  ]);

  const table: Content = {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [130, 'auto', '*', 60],
      body: [header, ...rows],
    },
    layout: PDF_TABLE_LAYOUT,
  };

  return {
    info: { title: `Équipes · ${tournament.name}` },
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
      }),
      table,
    ],
  };
}
