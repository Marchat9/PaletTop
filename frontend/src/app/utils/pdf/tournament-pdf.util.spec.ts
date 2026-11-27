import { describe, expect, it } from 'vitest';
import { buildTournamentPdfHeader } from './tournament-pdf.util';

const APP_URL = 'https://palettop.example/';

/** Every caption text of the header, wherever pdfmake nests it. */
function texts(node: unknown): string[] {
  if (Array.isArray(node)) {
    return node.flatMap(texts);
  }
  if (node && typeof node === 'object') {
    const { text, ...rest } = node as { text?: unknown };
    return [...(typeof text === 'string' ? [text] : []), ...Object.values(rest).flatMap(texts)];
  }
  return [];
}

describe('buildTournamentPdfHeader', () => {
  it('captions the app QR code with the app name rather than its address', () => {
    const header = buildTournamentPdfHeader({
      tournamentName: 'Tournoi Test',
      tournamentCode: '4821',
      appUrl: APP_URL,
      spectatorUrl: `${APP_URL}spectateur/4821`,
    });

    expect(texts(header)).toContain('PaletTop');
    expect(texts(header)).not.toContain(APP_URL);
  });
});
