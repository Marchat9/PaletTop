/**
 * Plate of each match of a round, in the order of the matches: 1, 2, 3... A bye is played on no
 * plate and gets none. The matchmaking never plans more matches than the session has plates.
 */
export function plateNumbers(matches: { isBye: boolean }[]): (number | null)[] {
    let next = 1;
    return matches.map((match) => (match.isBye ? null : next++));
}
