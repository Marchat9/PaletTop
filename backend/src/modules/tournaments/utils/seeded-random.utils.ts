import { fixedDraw } from './fixed-draw.utils';

/** What a seeded draw is for: part of the seed, so two uses never share the same values. */
export type SeedUsage = 'bye' | 'draw' | 'bracket';

/**
 * Seed of a draw: `${tournamentId}:${usage}:${sessionNumber}:${attempt}[:${groupKey}]`. The attempt
 * is always 0 for now: it is there so a round could be drawn again later with another value.
 */
export function buildSeed(
    tournamentId: string,
    usage: SeedUsage,
    sessionNumber: number,
    groupKey?: string,
): string {
    const attempt = 0;
    const base = `${tournamentId}:${usage}:${sessionNumber}:${attempt}`;
    return groupKey ? `${base}:${groupKey}` : base;
}

/**
 * Deterministic random numbers in [0, 1) (mulberry32), started from the frozen draw hash of the
 * seed: the same seed always gives the same sequence, so a tournament can be replayed.
 */
export function seededRandom(seed: string): () => number {
    let state = fixedDraw(seed);
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
