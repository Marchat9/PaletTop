# UpDownTournamentStrategy — Up-down (UP_DOWN)

## Idea

No real pools: all teams are in one technical pool and play a series of rounds.

- **Drawn rounds**: each round is a random draw with constraints (same club, rematch), using
  `generateMatchesInPool` — the same code as the STANDARD pool rounds.
- **Frozen last round** (`lastRoundByRanking`, « Figer la dernière partie »): if enabled and
  `numberOfRound` is at least 2, round `numberOfRound` is not drawn.
- **Seeded draws**: nothing uses `Math.random`. Every draw takes a `seededRandom` started from
  `buildSeed(tournamentId, usage, sessionNumber[, groupKey])` (`../../utils/seeded-random.utils.ts`),
  so the same tournament always gives the same rounds. Teams are put in id order before a seeded
  shuffle, whatever the order the database returns them in.

## Pairing mode (`pairingMode`)

| Value       | Label (UI)            | Rounds 2+                                                           |
| ----------- | --------------------- | ------------------------------------------------------------------- |
| `dutch`     | Gagnant/Perdant       | Dutch Swiss pairing (`dutch-pairing.utils.ts`)                      |
| `neighbors` | Voisins de classement | Ranking neighbours, constraints kept as far as possible (see below) |
| `random`    | Aléatoire             | Drawn (`generateMatchesInPool`), as round 1                         |

The creation form preselects `dutch`; a missing value (tournaments created before the option, or
an API call without it) reads as `random`. Round 1 is always drawn, and its plates are shuffled
with the seed.

### Plates by ranking

From round 2, plate 1 is the match of the best ranked team, then the plates go down the ranking
(`orderMatchesByRanking`): a match counts for its best ranked team, byes come last and get no plate.
Only up/down does this; the structured mode keeps its plate order.

### Ranking neighbours

`neighbor-pairing.utils.ts`: the ranking is recomputed after each round (the tournament's score
calculation, frozen draw included). With an odd number of teams, the bye goes first to a team among
those with the fewest byes, drawn with the seed (usage `bye`). The others are paired 1-2, 3-4…
`pairNeighbors` reuses the Dutch search with the same constraint levels (`buildDutchLevels`: the
tournament's own settings first, then relaxed): depth-first, the best ranked unpaired team first, its
opponents by increasing rank distance, so the top of the ranking is the last to be bent. The last
level has no constraint and is the pure neighbours, so a pairing always comes out. A tournament that
allows rematches and clubs gets pure neighbours.

Like the Dutch rounds, neighbour rounds depend on results: `isDrawnSession` is false for them.

### Dutch pairing

1. **Bye** (odd count): the lowest-ranked team among those with the fewest byes; worth one win
   with a neutral goal average (`byeWin`).
2. **Score groups**: teams with the same number of **wins** (whatever the score calculation), most
   wins first, ranking order inside.
3. **Preferences**: inside a group, the top half plays the bottom half (1v5, 2v6, 3v7, 4v8 for 8
   teams), then the other teams of the group, then the lower groups (a team floats down), then the
   upper ones. With an odd group, its lowest team floats down to the top of the next group.
4. **Search**: depth-first, highest-ranked unpaired team first, opponents in preference order;
   the first complete pairing is kept (deterministic).
5. **Constraints**: the tournament's own settings first (club constraint, and no rematch only when
   `allowRematch` is off), then relaxed (bounded search per level): club constraint dropped, then
   none. An allowed rematch never bends the Dutch pairing (`buildDutchLevels`).

Dutch rounds depend on results: `isDrawnSession` is false for them, so their scores are locked
once the round is closed.

## Frozen last round

When `isRankingRound(config, sessionNumber)` is true:

1. The global ranking is computed after the previous round (`computeGlobalRanking`).
2. Teams are sorted by rank; exact ties are broken by team id (`orderTeamsByRanking`), so the
   result is reproducible.
3. Each team plays its ranking neighbour: 1st vs 2nd, 3rd vs 4th… (`generateMatchesByRanking`).
   Draw constraints are ignored, in both pairing modes: a rematch is played if the ranking says so.
4. With an odd number of teams, the last one gets a **bye worth nothing** (0-0): no win, no
   points, in both the global and the pool ranking.
5. Plates follow the ranking (plate 1 = 1st vs 2nd).
6. **Final standings** (`computeStandings`, `computeFrozenStandings`): once the round is validated,
   the winner of plate 1 is 1st, its opponent 2nd, the winner of plate 2 3rd, and so on; the bye
   team is last. The stats come from the aggregate ranking, only the rank is rewritten. Until then,
   and without a frozen round, the standings are the aggregate ranking.

## Byes

A bye in a drawn, Dutch or neighbour round is a won match against nobody, stored as the target
score against `clamp(pointsPerGame − 1, 0, cap)` (13-6 at 13 points, 11-6 at 11; `computeByeScore`
in `../../utils/bye.utils.ts`), flagged `byeWin`. It counts as a win, in points and in the goal
average, but not in the game-by-game gaps. `cap` is the app setting `bye_loser_score_cap` (6 by
default, 0 to 12), read by `SessionService` and passed to the strategy as `GenerationOptions`. The
frozen last-round bye (0-0, `NO_VALUE_BYE`) and the elimination byes (0-0 win, `NEUTRAL_BYE_WIN`)
are the exceptions. Screens show « Exempté », never a score.

## Configuration

| Field                | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `numberOfRound`      | Number of rounds. Empty: unlimited, the admin ends it manually                   |
| `lastRoundByRanking` | Freeze the last round (« Figer la dernière partie »). Needs `numberOfRound >= 2` |
| `pairingMode`        | `dutch` (preselected in the form), `neighbors`, or `random` (when missing)       |

## Phase name (`phaseName`)

| Tournament state          | Label                                       |
| ------------------------- | ------------------------------------------- |
| Draft / cancelled         | _(empty)_                                   |
| Active                    | `Partie x/N` (or `Partie x` when unlimited) |
| Active, frozen last round | `Montée / Descente — Dernière partie figée` |
| Completed                 | `Montée / Descente terminée`                |

## Ranking

`computeGlobalRanking` is not overridden: the base class ranks with the generic module
`../../utils/ranking-calculation.utils.ts` (`rankTeams`), by the tournament's `scoreCalculation`.
The up-down mode offers the three victory-based calculations by default, goal-average first (app
setting `score_calculations_by_mode`). See « Score calculations » in `../README.md`.

## Injected dependencies

`PoolService`, `MatchRepository`.
