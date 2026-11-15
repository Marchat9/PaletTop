import type {
  Column,
  Content,
  CustomTableLayout,
  DynamicContent,
  StyleDictionary,
} from 'pdfmake/interfaces';
import QRCode from 'qrcode-svg';

// The PDF is always printed light whatever the app theme, like the former print sheet: these
// are paper colours, not theme tokens.
const INK = '#1a1a1a';
const BORDER = '#cccccc';
const ZEBRA = '#f0f0f0';
const MUTED = '#666666';

export const PDF_PAGE_MARGINS: [number, number, number, number] = [40, 40, 40, 50];
/** A4 width (595.28pt) minus the left and right margins. */
export const PDF_CONTENT_WIDTH = 595.28 - PDF_PAGE_MARGINS[0] - PDF_PAGE_MARGINS[2];

const HEADER_QR_SIZE = 75;

export interface TournamentPdfHeader {
  tournamentName: string;
  tournamentCode: string;
  appUrl: string;
  spectatorUrl: string;
  /** Optional line under the tournament name (e.g. « Classement final »). */
  subtitle?: string;
}

export const PDF_STYLES: StyleDictionary = {
  title: { fontSize: 20, bold: true, color: INK },
  subtitle: { fontSize: 13, bold: true, color: INK, margin: [0, 2, 0, 0] },
  codeLabel: { fontSize: 11, color: INK },
  codeValue: { fontSize: 15, bold: true, characterSpacing: 1.5, color: INK },
  qrCaption: { fontSize: 7, color: INK, alignment: 'center' },
  tableHeader: { bold: true, color: INK },
  legend: { fontSize: 8, color: MUTED, margin: [0, 6, 0, 0] },
};

/** Grey grid with zebra rows, same look as the former printed table. */
export const PDF_TABLE_LAYOUT: CustomTableLayout = {
  hLineWidth: () => 0.75,
  vLineWidth: () => 0.75,
  hLineColor: () => BORDER,
  vLineColor: () => BORDER,
  paddingLeft: () => 8,
  paddingRight: () => 8,
  paddingTop: () => 5,
  paddingBottom: () => 5,
  fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex % 2 === 0 ? ZEBRA : null),
};

/** Square SVG QR code for the given URL (no XML declaration, so pdfmake can embed it). */
export function qrCodeSvg(content: string, size: number): string {
  return new QRCode({
    content,
    width: size,
    height: size,
    padding: 1,
    join: true,
    xmlDeclaration: false,
  }).svg();
}

function qrFigure(url: string, caption: Content): Column {
  return {
    width: HEADER_QR_SIZE + 20,
    stack: [
      { svg: qrCodeSvg(url, HEADER_QR_SIZE), width: HEADER_QR_SIZE, alignment: 'center' },
      caption,
    ],
  };
}

/** First-page header: tournament name, boxed code, app and spectator QR codes, then a rule. */
export function buildTournamentPdfHeader(header: TournamentPdfHeader): Content[] {
  const titleBlock: Content[] = [{ text: header.tournamentName, style: 'title' }];
  if (header.subtitle) {
    titleBlock.push({ text: header.subtitle, style: 'subtitle' });
  }
  titleBlock.push({
    margin: [0, 10, 0, 0],
    columns: [
      { width: 'auto', text: 'Code du tournoi :', style: 'codeLabel', margin: [0, 6, 8, 0] },
      {
        width: 'auto',
        table: { body: [[{ text: header.tournamentCode, style: 'codeValue' }]] },
        layout: {
          hLineWidth: () => 1.5,
          vLineWidth: () => 1.5,
          hLineColor: () => INK,
          vLineColor: () => INK,
          paddingLeft: () => 9,
          paddingRight: () => 9,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
    ],
  });

  return [
    {
      columnGap: 12,
      columns: [
        { width: '*', stack: titleBlock },
        qrFigure(header.appUrl, { text: header.appUrl, style: 'qrCaption', margin: [0, 3, 0, 0] }),
        qrFigure(header.spectatorUrl, {
          text: 'Spectateur',
          style: 'qrCaption',
          bold: true,
          margin: [0, 3, 0, 0],
        }),
      ],
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: PDF_CONTENT_WIDTH, y2: 0, lineWidth: 2, lineColor: INK },
      ],
      margin: [0, 10, 0, 14],
    },
  ];
}

/** « Tournoi · Page x / N » centred at the bottom of every page. */
export function buildPdfFooter(tournamentName: string): DynamicContent {
  return (currentPage: number, pageCount: number) => ({
    text: `${tournamentName} · Page ${currentPage} / ${pageCount}`,
    alignment: 'center',
    fontSize: 8,
    color: MUTED,
    margin: [0, 20, 0, 0],
  });
}

/** File-system friendly name: « Open d'été 2026 » → « open-d-ete-2026 ». */
export function pdfFileSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tournoi'
  );
}
