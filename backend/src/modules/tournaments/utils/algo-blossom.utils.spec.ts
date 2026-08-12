import { describe, expect, it } from 'vitest';
import { findMaximumMatching } from './algo-blossom.utils';

function emptyAdjacency(n: number): boolean[][] {
    return Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
}

function addEdge(adjacency: boolean[][], a: number, b: number): void {
    adjacency[a][b] = true;
    adjacency[b][a] = true;
}

function addCycle(adjacency: boolean[][], nodes: number[]): void {
    for (let i = 0; i < nodes.length; i++) {
        addEdge(adjacency, nodes[i], nodes[(i + 1) % nodes.length]);
    }
}

// Deterministic PRNG (mulberry32) so randomized trials below are reproducible, not flaky.
function mulberry32(seed: number): () => number {
    let state = seed;
    return () => {
        state |= 0;
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function randomAdjacency(n: number, edgeProbability: number, rng: () => number): boolean[][] {
    const adjacency = emptyAdjacency(n);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (rng() < edgeProbability) addEdge(adjacency, i, j);
        }
    }
    return adjacency;
}

// Exhaustive reference matcher (exponential — only ever used on small graphs in tests)
// used to prove findMaximumMatching returns a matching of truly maximum size.
function bruteForceMaxMatchingSize(n: number, adjacency: boolean[][]): number {
    const used = new Array<boolean>(n).fill(false);
    let best = 0;

    const search = (count: number): void => {
        best = Math.max(best, count);
        let first = -1;
        for (let i = 0; i < n; i++) {
            if (!used[i]) {
                first = i;
                break;
            }
        }
        if (first === -1) return;

        used[first] = true;
        search(count); // branch: leave `first` unmatched
        for (let j = first + 1; j < n; j++) {
            if (!used[j] && adjacency[first][j]) {
                used[j] = true;
                search(count + 1); // branch: pair `first` with `j`
                used[j] = false;
            }
        }
        used[first] = false;
    };

    search(0);
    return best;
}

function matchingSize(match: number[]): number {
    return match.filter((partner) => partner !== -1).length / 2;
}

function isValidMatching(n: number, adjacency: boolean[][], match: number[]): boolean {
    if (match.length !== n) return false;
    for (let i = 0; i < n; i++) {
        const partner = match[i];
        if (partner === -1) continue;
        if (partner === i) return false;
        if (match[partner] !== i) return false; // matching must be symmetric
        if (!adjacency[i][partner]) return false; // must be a real edge
    }
    return true;
}

describe('findMaximumMatching', () => {
    it('returns an empty result for an empty graph', () => {
        expect(findMaximumMatching(0, [])).toEqual([]);
    });

    it('leaves an isolated node unmatched', () => {
        const adjacency = emptyAdjacency(3);
        addEdge(adjacency, 0, 1);

        const match = findMaximumMatching(3, adjacency);

        expect(isValidMatching(3, adjacency, match)).toBe(true);
        expect(matchingSize(match)).toBe(1);
        expect(match[2]).toBe(-1);
    });

    it('returns no matching at all when the graph has no edges', () => {
        const match = findMaximumMatching(5, emptyAdjacency(5));
        expect(matchingSize(match)).toBe(0);
    });

    it('finds a perfect matching on a simple 4-cycle', () => {
        const adjacency = emptyAdjacency(4);
        addCycle(adjacency, [0, 1, 2, 3]);

        const match = findMaximumMatching(4, adjacency);

        expect(isValidMatching(4, adjacency, match)).toBe(true);
        expect(matchingSize(match)).toBe(2);
    });

    it('finds a perfect matching on a complete graph', () => {
        const n = 8;
        const adjacency = emptyAdjacency(n);
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) addEdge(adjacency, i, j);
        }

        const match = findMaximumMatching(n, adjacency);

        expect(isValidMatching(n, adjacency, match)).toBe(true);
        expect(matchingSize(match)).toBe(n / 2);
    });

    it('finds the true maximum matching, not just a maximal one (triangle + pendant)', () => {
        // A matcher that greedily commits to the first edge it tries (e.g. 1-2) can get
        // stuck below the real maximum here, since 0 and 3 then have no edge left between
        // them — even though a perfect matching (0-1, 2-3) exists.
        const adjacency = emptyAdjacency(4);
        addEdge(adjacency, 0, 1);
        addEdge(adjacency, 1, 2);
        addEdge(adjacency, 2, 0);
        addEdge(adjacency, 2, 3);

        const match = findMaximumMatching(4, adjacency);

        expect(isValidMatching(4, adjacency, match)).toBe(true);
        expect(matchingSize(match)).toBe(2);
    });

    it('finds the maximum matching across an odd cycle with pendants (needs blossom contraction)', () => {
        // A 5-cycle plus two pendant nodes hanging off it. This shape is the classic
        // example used to demonstrate why odd cycles must be contracted: a search that
        // does not shrink blossoms can wrongly conclude the maximum matching is smaller
        // than it really is.
        const adjacency = emptyAdjacency(7);
        addCycle(adjacency, [0, 1, 2, 3, 4]);
        addEdge(adjacency, 2, 5);
        addEdge(adjacency, 4, 6);

        const match = findMaximumMatching(7, adjacency);

        expect(isValidMatching(7, adjacency, match)).toBe(true);
        expect(matchingSize(match)).toBe(bruteForceMaxMatchingSize(7, adjacency));
        expect(matchingSize(match)).toBe(3); // 7 nodes: exactly one must stay unmatched
    });

    describe('differential testing against a brute-force reference', () => {
        it('matches brute-force maximum matching size on random sparse/dense graphs', () => {
            const rng = mulberry32(20260812);

            for (let trial = 0; trial < 300; trial++) {
                const n = 4 + Math.floor(rng() * 7); // 4..10 nodes
                const density = 0.15 + rng() * 0.7;
                const adjacency = randomAdjacency(n, density, rng);

                const match = findMaximumMatching(n, adjacency);

                expect(isValidMatching(n, adjacency, match)).toBe(true);
                expect(matchingSize(match)).toBe(bruteForceMaxMatchingSize(n, adjacency));
            }
        });

        it('matches brute-force maximum matching size on graphs built from odd cycles (blossom-heavy)', () => {
            const rng = mulberry32(7182818);

            for (let trial = 0; trial < 150; trial++) {
                const cycleLength = 5 + 2 * Math.floor(rng() * 3); // 5, 7 or 9
                const extra = Math.floor(rng() * 3); // 0..2 pendant nodes
                const n = cycleLength + extra;
                const adjacency = emptyAdjacency(n);
                addCycle(
                    adjacency,
                    Array.from({ length: cycleLength }, (_, i) => i),
                );
                for (let i = 0; i < extra; i++) {
                    addEdge(adjacency, Math.floor(rng() * cycleLength), cycleLength + i);
                }
                // Sprinkle a few random chords on top of the cycle.
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        if (rng() < 0.1) addEdge(adjacency, i, j);
                    }
                }

                const match = findMaximumMatching(n, adjacency);

                expect(isValidMatching(n, adjacency, match)).toBe(true);
                expect(matchingSize(match)).toBe(bruteForceMaxMatchingSize(n, adjacency));
            }
        });
    });

    describe('at tournament scale', () => {
        it('finds a perfect matching for 200 densely-connected nodes, well within a couple seconds', () => {
            const n = 200;
            const rng = mulberry32(200);
            // Dense-but-not-complete graph, similar to "most pairs allowed, some forbidden
            // by club/rematch constraints" — the exact scenario that used to crash.
            const adjacency = randomAdjacency(n, 0.85, rng);
            // Guarantee a perfect matching exists regardless of the random holes, so this
            // test asserts completion + correctness rather than depending on luck.
            for (let i = 0; i < n; i += 2) addEdge(adjacency, i, i + 1);

            const start = Date.now();
            const match = findMaximumMatching(n, adjacency);
            const elapsedMs = Date.now() - start;

            expect(isValidMatching(n, adjacency, match)).toBe(true);
            expect(matchingSize(match)).toBe(n / 2);
            expect(elapsedMs).toBeLessThan(2000);
        });

        it('does not hang on a sparse 200-node graph with no perfect matching', () => {
            const n = 200;
            const rng = mulberry32(201);
            const adjacency = randomAdjacency(n, 0.02, rng); // sparse: very unlikely to be perfect

            const start = Date.now();
            const match = findMaximumMatching(n, adjacency);
            const elapsedMs = Date.now() - start;

            expect(isValidMatching(n, adjacency, match)).toBe(true);
            expect(elapsedMs).toBeLessThan(2000);
        });
    });
});
