# UpDownTournamentStrategy — Up-down (UP_DOWN)

## Idea

No real pools: all teams are in one technical pool and play a series of rounds.

- **Drawn rounds**: each round is a random draw with constraints (same club, rematch), using
  `generateMatchesInPool` — the same code as the STANDARD pool rounds.
- **Last round by ranking** (`lastRoundByRanking`): if enabled and `numberOfRound` is at least 2,
  round `numberOfRound` is not drawn.

## Last round by ranking

When `isRankingRound(config, sessionNumber)` is true:

1. The global ranking is computed after the previous round (`computeGlobalRanking`).
2. Teams are sorted by rank; exact ties are broken by team id (`orderTeamsByRanking`), so the
   result is reproducible.
3. Each team plays its ranking neighbour: 1st vs 2nd, 3rd vs 4th… (`generateMatchesByRanking`).
   Draw constraints are ignored.
4. With an odd number of teams, the last one gets a **bye worth nothing** (0-0): no win, no
   points, in both the global and the pool ranking.
5. Plates follow the ranking (plate 1 = 1st vs 2nd).

## Configuration

| Field                | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `numberOfRound`      | Number of rounds. Empty: unlimited, the admin ends it manually |
| `lastRoundByRanking` | Last round by ranking. Needs `numberOfRound >= 2`              |

## Phase name (`phaseName`)

| Tournament state            | Label                                                 |
| --------------------------- | ----------------------------------------------------- |
| Draft / cancelled           | _(empty)_                                             |
| Active                      | `Partie x/N` (or `Partie x` when unlimited)           |
| Active, last round by rank  | `Montée / Descente — Dernière partie (au classement)` |
| Completed                   | `Montée / Descente terminée`                          |

## Ranking

`computeGlobalRanking` is not overridden: the base class sorts by the tournament's
`scoreCalculation`.

## Injected dependencies

`PoolService`, `MatchRepository`.
