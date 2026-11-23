# StructuredTournamentStrategy — Pools + brackets (STANDARD)

## Idea

The default mode. Teams are split into pools and play a number of qualifying rounds. Then the
best teams go into elimination brackets (principal, plus optional extra tables).

## Flow

```
startTournament()
  ├── prepareTournamentStart()   → freeze the plan (consolations, stopped teams)
  ├── assignTeamsToFirstPools()  → a single qualifying pool
  └── generateSessionMatches()   → one call per session
        ├── session ≤ numberOfQualifyingRounds → generateQualifyingMatches (draw in each pool)
        └── session > numberOfQualifyingRounds → generateEliminationMatches (plan round)
```

Plates are numbered 1, 2, 3… after each generation.

## Configuration

| Field                       | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `numberOfQualifyingRounds`  | Number of qualifying rounds (single pool, default 4)                 |
| `consolationCount`          | Consolation brackets under the main one (0 = main only)              |
| `hasChallenges`             | One challenge per bracket, for its first-round losers                |
| `hasThirdPlaceMatch`        | Third-place match between the main semi-final losers                 |
| `eliminatedAfterQualifying` | Written at launch: the last X teams of the qualifiers stop           |
| `plan`                      | Written at launch: the frozen plan the elimination rounds follow     |

## Qualifying rounds

In each pool, `generateMatchesInPool` (`../../utils/match.utils.ts`):

- With an odd number of teams, the team with the fewest past byes gets a bye (random on a tie):
  stored `0-0`, `VALIDATED`, `isBye = true`, `byeWin = true`: one win, nothing added to the goal
  average nor to the sum of scores, left out of the Buchholz. (Byes created before `byeWin`
  existed were stored `pointsPerGame`-0 and keep counting that way.)
- Pairs are drawn by `generatePairsWithContraints` (`../../utils/draw.utils.ts`). It tries
  constraint levels from strictest to loosest (no rematch, no same club, no partial same club…),
  starting with the levels allowed by the tournament config (`buildConstraintLadder`). The last
  level has no constraint, so a solution is always found.

## Elimination

The elimination rounds follow the plan frozen at launch (`config.plan`, see `plan/`): the session
`n` plays the groups of the plan round `n`, in the plan's order (Main, 3rd place, Challenge main,
A, Challenge A, B…), which is the plate order. Each group is drawn with the constrained draw in a
virtual pool named after its group key (`principale`, `third_place_match`, `challenge_principale`,
`consolante_1`, `challenge_consolante_1`…). `EliminationTeamsResolver`
(`elimination-teams.utils.ts`) gives each group its teams:

- **Main / consolations**: at elimination 1, their slice of the qualifying ranking over the
  non-stopped teams (the last `eliminatedAfterQualifying` teams play no elimination match); then
  their own winners (byes count as wins), plus the plan's `bestLosersIn` best losers after the
  first round of an incomplete bracket.
- **Challenges**: from elimination 2, the parent's first-round losers minus the best losers
  brought back to the parent; then like any bracket.
- **Third place**: the two main semi-final losers, played with the final.

An odd group gives one bye to the team with the fewest byes, then the best ranked; it counts as
a win. Best losers are ranked by `rankBestLosers` (`best-losers.utils.ts`): goal average of the
lost match, cumulative ranking, previous matches' goal average walking back, then a random draw.

## Ranking

- `computeGlobalRanking` (default) seeds the brackets.
- `computeStandings` (override) gives the final ranking: grouped by table in the group order
  (the 3rd place counted with the main), then teams out after the pools, then by how far the team
  went, the score of its last match, and its seed.

## Phase name and end (`computeTournamentStatus`)

The phase name is the label of the plan round being played (`Phase qualificative x/N`,
`Élimination n`, `Quarts de finale`, `Demi-finales`, `Finale`, with `+ Petite Finale` when the
3rd place match is played in that round); `Tournoi terminé` once completed, empty in draft. The
tournament can finish once every match of the plan's last round is validated; a new session can
be generated while the plan has rounds left.

## Injected dependencies

`PoolService`, `MatchRepository`, `PoolRepository`, `TournamentRepository`.
