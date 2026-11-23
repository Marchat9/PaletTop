// --- Bracket sizes ---

/**
 * Size of the principal bracket: smallest power of two >= N/2.
 * e.g. 14 -> 8 | 62 -> 32 | 10 -> 8
 */
export function computePrincipalBracketSize(teamCount: number): number {
    return Math.pow(2, Math.max(1, Math.ceil(Math.log2(teamCount / 2))));
}
