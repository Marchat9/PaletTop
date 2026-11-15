import type { ContentTable, ContentText } from 'pdfmake/interfaces';
import { SessionMatchDto } from 'src/app/models/matches-session.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { buildMatchesPdf, matchesPdfFileName, PdfMatchRound } from './matches-pdf.util';

const TOURNAMENT = {
  id: 't1',
  code: 'OPEN',
  name: 'Open de Vannes',
  status: TournamentStatus.FINISHED,
  configuration: { competitionMode: 'standard' },
} as TournamentDto;

function match(id: string, scoreA: number, scoreB: number, extra: Partial<SessionMatchDto> = {}) {
  return {
    id,
    status: 'VALIDATED',
    isBye: false,
    scoreA,
    scoreB,
    plateNumber: 1,
    teamA: { id: `${id}-a`, name: `${id} A` },
    teamB: { id: `${id}-b`, name: `${id} B` },
    ...extra,
  } as SessionMatchDto;
}

const ROUNDS: PdfMatchRound[] = [
  {
    sessionNumber: 2,
    label: 'Tableau principal',
    groups: [{ label: 'Tableau principal', matches: [match('final', 9, 13)] }],
  },
  {
    sessionNumber: 1,
    label: 'Qualifications',
    groups: [
      {
        label: 'Poule 1',
        matches: [
          match('m1', 13, 7),
          match('bye', 13, 0, { isBye: true, teamB: null, plateNumber: null }),
        ],
      },
    ],
  },
];

function content() {
  return buildMatchesPdf(TOURNAMENT, ROUNDS, 'https://palettop.fr').content as unknown[];
}

function tables(): ContentTable[] {
  return content().filter((block) => (block as ContentTable).table) as ContentTable[];
}

describe('buildMatchesPdf', () => {
  it('lists the rounds in playing order with their phase', () => {
    const titles = content()
      .filter((block) => (block as ContentText).style === 'roundTitle')
      .map((block) => (block as ContentText).text);

    expect(titles).toEqual(['Round 1 · Qualifications', 'Round 2 · Tableau principal']);
  });

  it('shows each match score in the middle and the winner in bold', () => {
    const all = tables();
    const qualifying = all[all.length - 2].table;
    const [plate, teamA, score, teamB] = qualifying.body[1] as { text: string; bold?: boolean }[];

    expect(qualifying.headerRows).toBe(1);
    expect(plate.text).toBe('1');
    expect(score.text).toBe('13 – 7');
    expect(teamA.bold).toBe(true);
    expect(teamB.bold).toBe(false);
  });

  it('marks a bye instead of a score', () => {
    const all = tables();
    const byeRow = all[all.length - 2].table.body[2] as { text: string }[];

    expect(byeRow[2].text).toBe('Exempté');
  });

  it('titles each pool or bracket', () => {
    const groups = content()
      .filter((block) => (block as ContentText).style === 'groupTitle')
      .map((block) => (block as ContentText).text);

    expect(groups).toEqual(['Poule 1', 'Tableau principal']);
  });

  it('names the file after the tournament', () => {
    expect(matchesPdfFileName(TOURNAMENT)).toBe('matchs-open-de-vannes.pdf');
  });
});
