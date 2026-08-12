// General (non-bipartite) maximum matching via Edmonds' Blossom algorithm — O(V^3).
//
// This is domain-agnostic: nodes are plain indices (0..n-1) and edges come from a
// boolean adjacency matrix. Any team-pairing semantics (constraints, weights, byes)
// belong in the caller — this file only answers "what is the largest set of disjoint
// edges I can pick?".
//
// Unlike a plain augmenting-path search (which works for bipartite graphs), a general
// graph can contain odd-length cycles ("blossoms") that trap the search into thinking
// no augmenting path exists when one actually does, just not along a simple path. The
// algorithm below detects those cycles and contracts them into a single node before
// continuing, which is what makes it correct on arbitrary graphs — exactly what's
// needed here, since any team can face any other team.

/**
 * Finds a maximum matching in an undirected graph.
 * @param n number of nodes, indexed 0..n-1
 * @param adjacency symmetric n x n matrix; adjacency[i][j] = true means an edge is allowed between i and j
 * @returns match array of length n; match[i] is the matched partner of i, or -1 if i is unmatched
 */
export function findMaximumMatching(n: number, adjacency: boolean[][]): number[] {
    const match = new Array<number>(n).fill(-1);
    // Alternating-tree parent of each node, rebuilt on every search from a new root.
    const parent = new Array<number>(n).fill(-1);
    // base[i] = representative node of the blossom currently containing i (itself if none).
    const base = new Array<number>(n).fill(0);
    const inBlossom = new Array<boolean>(n).fill(false);
    const visited = new Array<boolean>(n).fill(false);

    // Walks up the alternating tree from both edge endpoints towards the root; the
    // first node common to both walks is the base of the blossom this edge closes.
    const findBlossomBase = (start1: number, start2: number): number => {
        const seen = new Array<boolean>(n).fill(false);

        let node = start1;
        while (true) {
            node = base[node];
            seen[node] = true;
            if (match[node] === -1) break;
            node = parent[match[node]];
        }

        node = start2;
        while (true) {
            node = base[node];
            if (seen[node]) return node;
            node = parent[match[node]];
        }
    };

    // Re-labels every node on the two tree paths (v.. and child..) up to blossomBase so
    // they share the same base, collapsing the odd cycle into one super-node for the
    // rest of the current search.
    const contractBlossom = (v: number, blossomBase: number, child: number): void => {
        while (base[v] !== blossomBase) {
            inBlossom[base[v]] = true;
            inBlossom[base[match[v]]] = true;
            parent[v] = child;
            child = match[v];
            v = parent[match[v]];
        }
    };

    // BFS for an augmenting path starting from an unmatched root.
    // Returns the unmatched node it reaches, or -1 if the root's whole component is exhausted.
    const findAugmentingPath = (root: number): number => {
        visited.fill(false);
        parent.fill(-1);
        for (let i = 0; i < n; i++) base[i] = i;

        visited[root] = true;
        const queue: number[] = [root];

        for (let qi = 0; qi < queue.length; qi++) {
            const v = queue[qi];

            for (let to = 0; to < n; to++) {
                if (!adjacency[v][to] || base[v] === base[to] || match[v] === to) continue;

                if (to === root || (match[to] !== -1 && parent[match[to]] !== -1)) {
                    // v-to closes an odd cycle back onto the alternating tree: shrink it.
                    const blossomBase = findBlossomBase(v, to);
                    inBlossom.fill(false);
                    contractBlossom(v, blossomBase, to);
                    contractBlossom(to, blossomBase, v);

                    for (let i = 0; i < n; i++) {
                        if (inBlossom[base[i]]) {
                            base[i] = blossomBase;
                            if (!visited[i]) {
                                visited[i] = true;
                                queue.push(i);
                            }
                        }
                    }
                } else if (parent[to] === -1) {
                    // Extend the alternating tree through the matched edge at `to`.
                    parent[to] = v;
                    if (match[to] === -1) {
                        return to; // unmatched node reached: augmenting path found
                    }
                    visited[match[to]] = true;
                    queue.push(match[to]);
                }
            }
        }

        return -1;
    };

    for (let root = 0; root < n; root++) {
        if (match[root] !== -1) continue;

        const reached = findAugmentingPath(root);
        if (reached === -1) continue;

        // Flip matched/unmatched edges along the path from `reached` back to `root`.
        let node = reached;
        while (node !== -1) {
            const parentNode = parent[node];
            const nextNode = match[parentNode];
            match[node] = parentNode;
            match[parentNode] = node;
            node = nextNode;
        }
    }

    return match;
}
