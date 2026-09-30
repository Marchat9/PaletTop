import { describe, expect, it } from 'vitest';
import { EliminationTableau } from 'src/enum/tounament.enum';
import { computePrincipalBracketSize, computeTableTeamRankIndex } from './bracket.utils';

/** "1-8" style 1-based inclusive range, or "—" when the table has no round that session. */
function band(
    teamsLength: number,
    session: number,
    qualifying: number,
    table: EliminationTableau,
): string {
    const idx = computeTableTeamRankIndex(
        teamsLength,
        session,
        qualifying,
        computePrincipalBracketSize(teamsLength),
    )[table];
    return idx ? `${idx.rankIndexMin + 1}-${idx.rankIndexMax}` : '—';
}

function tableRow(teamsLength: number, session: number, qualifying = 2): string {
    return [
        EliminationTableau.PRINCIPALE,
        EliminationTableau.CHALLENGE,
        EliminationTableau.CONSOLANTE,
        EliminationTableau.CHALLENGE_CONSOLANTE,
    ]
        .map((table) => band(teamsLength, session, qualifying, table))
        .join(' | ');
}

describe('computeTableTeamRankIndex', () => {
    // principale | challenge | consolante | challenge-consolante, as ranges into the ranking.
    it('découpe les tableaux pour 16 équipes', () => {
        expect(tableRow(16, 3)).toBe('1-8 | — | 9-16 | —');
        expect(tableRow(16, 4)).toBe('1-4 | 5-8 | 9-12 | 13-16');
        expect(tableRow(16, 5)).toBe('1-2 | 5-6 | 9-10 | 13-14');
    });

    it('découpe les tableaux pour 32 équipes', () => {
        expect(tableRow(32, 3)).toBe('1-16 | — | 17-32 | —');
        expect(tableRow(32, 4)).toBe('1-8 | 9-16 | 17-24 | 25-32');
        expect(tableRow(32, 5)).toBe('1-4 | 9-12 | 17-20 | 25-28');
        expect(tableRow(32, 6)).toBe('1-2 | 9-10 | 17-18 | 25-26');
    });

    // Non power of two: the consolante runs out of rounds before the principal ("fin des
    // consolantes") instead of dragging a single team into a phantom round.
    it('arrête les consolantes quand elles sont épuisées pour 20 équipes', () => {
        expect(tableRow(20, 3)).toBe('1-16 | — | 17-20 | —');
        expect(tableRow(20, 4)).toBe('1-8 | 9-16 | 17-18 | 19-20');
        expect(tableRow(20, 5)).toBe('1-4 | 9-12 | — | —');
        expect(tableRow(20, 6)).toBe('1-2 | 9-10 | — | —');
    });
});
