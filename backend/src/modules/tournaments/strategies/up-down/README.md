# UpDownTournamentStrategy — Up-down (UP_DOWN)

## Idea

No real pools: all teams are in one technical pool and play a series of rounds.

- **Drawn rounds**: each round is a random draw with constraints (same club, rematch), using
  `generateMatchesInPool` — the same code as the STANDARD pool rounds.
- **Last round by ranking** (`lastRoundByRanking`): if enabled and `numberOfRound` is at least 2,
  round `numberOfRound` is not drawn.

## Pairing mode (`pairingMode`)

| Value    | Label (UI)                           | Rounds 2+                                      |
| -------- | ------------------------------------ | ---------------------------------------------- |
| `dutch`  | Système suisse (version hollandaise) | Dutch Swiss pairing (`dutch-pairing.utils.ts`) |
| `random` | Entièrement aléatoire                | Drawn (`generateMatchesInPool`), as round 1    |

The creation form preselects `dutch`; a missing value (tournaments created before the option, or
an API call without it) reads as `random`. Round 1 is always drawn.

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

## Last round by ranking

When `isRankingRound(config, sessionNumber)` is true:

1. The global ranking is computed after the previous round (`computeGlobalRanking`).
2. Teams are sorted by rank; exact ties are broken by team id (`orderTeamsByRanking`), so the
   result is reproducible.
3. Each team plays its ranking neighbour: 1st vs 2nd, 3rd vs 4th… (`generateMatchesByRanking`).
   Draw constraints are ignored, in both pairing modes: a rematch is played if the ranking says so.
4. With an odd number of teams, the last one gets a **bye worth nothing** (0-0): no win, no
   points, in both the global and the pool ranking.
5. Plates follow the ranking (plate 1 = 1st vs 2nd).

## Configuration

| Field                | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `numberOfRound`      | Number of rounds. Empty: unlimited, the admin ends it manually |
| `lastRoundByRanking` | Last round by ranking. Needs `numberOfRound >= 2`              |
| `pairingMode`        | `dutch` (preselected in the form) or `random` (when missing)   |

## Phase name (`phaseName`)

| Tournament state           | Label                                                 |
| -------------------------- | ----------------------------------------------------- |
| Draft / cancelled          | _(empty)_                                             |
| Active                     | `Partie x/N` (or `Partie x` when unlimited)           |
| Active, last round by rank | `Montée / Descente — Dernière partie (au classement)` |
| Completed                  | `Montée / Descente terminée`                          |

## Ranking

`computeGlobalRanking` is not overridden: the base class ranks with the generic module
`../../utils/ranking-calculation.utils.ts` (`rankTeams`), by the tournament's `scoreCalculation`.
The up-down mode offers the three victory-based calculations by default, goal-average first (app
setting `score_calculations_by_mode`). See « Score calculations » in `../README.md`.

## Injected dependencies

`PoolService`, `MatchRepository`.
