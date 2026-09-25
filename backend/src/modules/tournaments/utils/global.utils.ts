// Unbiased shuffle: every item has an equal chance of landing in any position. Walks the array from
// the end to the start and swaps each item with one picked at random among those before it (itself
// included). `random` is injectable for deterministic tests.
export function shuffleFisherYates<T>(array: T[], random: () => number = Math.random): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.min(Math.floor(random() * (i + 1)), i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
