# StructuredTournamentStrategy — Pools + brackets (STANDARD)

## Idea

The default mode. Teams are split into pools and play a number of qualifying rounds. Then the
best teams go into elimination brackets (principal, plus optional extra tables).

## Flow

```
startTournament()
  ├── prepareTournamentStart()   → fix principalBracketSize
  ├── assignTeamsToFirstPools()  → random split into numberOfPools pools
  └── generateSessionMatches()   → one call per session
        ├── session ≤ numberOfQualifyingRounds → generateQualifyingMatches (draw in each pool)
        └── session > numberOfQualifyingRounds → generateEliminationMatches (brackets)
```

Plates are numbered 1, 2, 3… after each generation.

## Configuration

| Field                         | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `numberOfPools`               | Number of qualifying pools                                         |
| `numberOfQualifyingRounds`    | Number of pool rounds (default 4)                                  |
| `principalBracketSize`        | Teams in the principal bracket. Must be a power of 2 ≤ team count, otherwise computed automatically |
| `hasConsolanteTable`          | Bracket for teams ranked below the principal bracket               |
| `hasChallengePrincipaleTable` | Bracket for teams losing the first principal round                 |
| `hasChallengeConsolanteTable` | Bracket for teams losing the first consolante round                |
| `hasThirdPlaceMatch`          | Third-place match between the principal semi-final losers          |

## Qualifying rounds

In each pool, `generateMatchesInPool` (`../../utils/match.utils.ts`):

- With an odd number of teams, the team with the fewest past byes gets a bye (random on a tie):
  `scoreA = pointsPerGame`, `scoreB = 0`, `VALIDATED`, `isBye = true` (counts as a win).
- Pairs are drawn by `generatePairsWithContraints` (`../../utils/draw.utils.ts`). It tries
  constraint levels from strictest to loosest (no rematch, no same club, no partial same club…),
  starting with the levels allowed by the tournament config (`buildConstraintLadder`). The last
  level has no constraint, so a solution is always found.

## Elimination

Each table is filled from its own previous results, not from the global ranking:

- **Principal**: top `principalBracketSize` of the ranking, then its own winners.
- **Consolante**: the rest of the ranking, then its own winners.
- **Challenge / Challenge-consolante**: start one round later with the first-round losers of
  the principal / consolante, then their own winners.
- **Third place**: the two principal semi-final losers, played with the final.

Each table uses a virtual pool named after its `MatchGroupKey`.

## Ranking

- `computeGlobalRanking` (default) seeds the brackets.
- `computeStandings` (override) gives the final ranking: grouped by table (principal, third
  place, challenge, consolante, challenge-consolante, then teams out after the pools), then by
  how far the team went, the score of its last match, and its seed.

## Phase name (`phaseName`)

| Tournament state            | Label                                   |
| --------------------------- | --------------------------------------- |
| Draft / cancelled           | _(empty)_                               |
| Qualifying                  | `Phase qualificative x/N`               |
| Elimination, > 4 teams left | `Phase éliminatoire`                    |
| 4 teams left                | `Demi-Finale`                           |
| 2 teams left                | `Finale` (`+ Petite Finale` if enabled) |
| Completed                   | `Tournoi terminé`                       |

## Injected dependencies

`PoolService`, `MatchRepository`, `PoolRepository`, `TournamentRepository`.
