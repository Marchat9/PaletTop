import { describe, expect, it } from 'vitest';
import { formatLogCount, formatLogDate, formatLogDateTime, formatLogDay } from './log-format.util';

describe('log-format.util', () => {
    it('writes the dates in Paris time, summer and winter alike', () => {
        // 20:30 UTC in November = 21:30 in Paris; 22:30 UTC in July = 00:30 the next day.
        expect(formatLogDay(new Date('2026-11-12T20:30:00Z'))).toBe('jeu. 12/11/2026');
        expect(formatLogDateTime(new Date('2026-11-12T20:30:00Z'))).toBe('12/11/2026 à 21:30');
        expect(formatLogDate(new Date('2026-07-01T22:30:00Z'))).toBe('02/07/2026');
    });

    it('marks a missing date', () => {
        expect(formatLogDate(null)).toBe('?');
    });

    it('counts with the right plural', () => {
        expect(formatLogCount(0, 'joueur', 'joueurs')).toBe('aucun joueur');
        expect(formatLogCount(1, 'joueur', 'joueurs')).toBe('1 joueur');
        expect(formatLogCount(3, 'joueur', 'joueurs')).toBe('3 joueurs');
    });
});
