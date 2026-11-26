# StructuredTournamentStrategy — Pools + brackets (STANDARD)

## Idea

The default mode. All teams play a number of qualifying rounds in a single pool. Then the teams
go into elimination brackets (a main bracket plus optional consolations, challenges and a 3rd
place match), following a plan computed from the number of teams.

## Flow

```
startTournament()
  ├── prepareTournamentStart()   → freeze the plan (consolations, stopped teams)
  ├── assignTeamsToFirstPools()  → a single qualifying pool
  └── generateSessionMatches()   → one call per session
        ├── session ≤ numberOfQualifyingRounds → generateQualifyingMatches (draw in each pool)
        └── session > numberOfQualifyingRounds → generateEliminationMatches (plan round)
```

Plates are numbered 1, 2, 3… after each generation; byes get none.

## Configuration

| Field                       | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `numberOfQualifyingRounds`  | Number of qualifying rounds (single pool, default 4)             |
| `consolationCount`          | Consolation brackets under the main one (0 = main only)          |
| `hasChallenges`             | One challenge per bracket, for its first-round losers            |
| `hasThirdPlaceMatch`        | Third-place match between the main semi-final losers             |
| `eliminationSeeding`        | `pyramidal` (default, also when missing) or `random`: see Elimination |
| `eliminatedAfterQualifying` | Written at launch: the last X teams of the qualifiers stop       |
| `plan`                      | Written at launch: the frozen plan the elimination rounds follow |

`maxTeamCapacity` is only a target: teams can register above it (`isTeamCapacityHard` is false).

## Plan and frozen plan

`computePlan` (`plan/structured-plan.ts`, `computeStructuredPlan`) turns the team count and the
configuration into a `TournamentPlan`: brackets (key, label, capacity, fill ratio and level),
rounds (qualifying and elimination, each with its groups, matches, byes and plates), warnings and
the launch options. In draft it is computed for the registered teams with the target
`maxTeamCapacity`; the super-admin thresholds (max consolations, fill levels) come from the app
settings (`PlanSettings`).

- `POST /tournaments/plan-preview` returns the plan (and its options) before the tournament exists.
- `POST /tournaments/:code/start` takes the admin's launch choice (`consolationCount`,
  `eliminatedAfterQualifying`). `prepareTournamentStart` freezes the matching plan (without its
  options) in `competitionConfiguration.plan`, together with both values. An impossible plan or
  more consolations than the setting allows refuses the start.
- Once started, `computePlan` returns the frozen plan as is, never recomputed.

## Group keys and labels

Index-based, so renaming never breaks anything (`plan/group-keys.ts`):

| Key                                    | Label                       | Display order |
| -------------------------------------- | --------------------------- | ------------- |
| `principale`                           | Principale                  | 1             |
| `third_place_match`                    | Match pour la 3e place      | 2             |
| `challenge_principale`                 | Challenge principale        | 3             |
| `consolante_i` (i = 1, 2…)             | Consolante A, B…            | 2i + 2        |
| `challenge_consolante_i`               | Challenge consolante A, B…  | 2i + 3        |

`groupOrder` and `groupLabel` work for any index. The group key is also the name of the virtual
pool holding the group's matches.

## Qualifying rounds

In each pool, `generateMatchesInPool` (`../../utils/match.utils.ts`):

- With an odd number of teams, the team with the fewest past byes gets a bye (drawn with the seed
  on a tie): stored `pointsPerGame` against `clamp(pointsPerGame - 1, 0, cap)` (13-6 at 13 points),
  `VALIDATED`, `isBye = true`, `byeWin = true`: one win, counted in points and goal average, left
  out of the worst loss and the game-by-game gaps. `cap` is the `bye_loser_score_cap` app setting
  (6 by default), see `../up-down/README.md`.
- Every draw is seeded (`../../utils/seeded-random.utils.ts`): the same tournament always gives the
  same rounds.
- Pairs are drawn by `generatePairsWithContraints` (`../../utils/draw.utils.ts`). It tries
  constraint levels from strictest to loosest (no rematch, no same club, no partial same club…),
  starting with the levels allowed by the tournament config (`buildConstraintLadder`). The last
  level has no constraint, so a solution is always found.

## Elimination

The elimination rounds follow the plan frozen at launch (`config.plan`, see `plan/`): the session
`n` plays the groups of the plan round `n`, in the plan's order (Main, 3rd place, Challenge main,
A, Challenge A, B…), which is the plate order. Each group is a fixed bracket tree in a virtual pool
named after its group key (`principale`, `third_place_match`, `challenge_principale`,
`consolante_1`, `challenge_consolante_1`…). There is no repêchage: a partial bracket gets byes.

### The tree

For a bracket of `n` teams, `size = powerOfTwoCeil(n)`; the first round has `size / 2` slots,
`size - n` of them byes and `n - size / 2` real matches (`plan/bracket-rounds.ts`,
`bracket/bracket.utils.ts`). Every match stores a `bracketPosition` (0-based in its round); in the
next round, match `k` takes the winners of positions `2k` and `2k + 1` (a bye winner is its team),
with no new draw and no constraint. `seedingOrder(size)` is the standard order: `order(2) = [1, 2]`,
then every position `p` of `order(k)` becomes `[p, 2k + 1 - p]` (`order(8) = [1, 8, 4, 5, 2, 7, 3,
6]`), so seed 1 and seed 2 can only meet in the final.

Byes are stored `0-0`, `isBye`, `byeWin`, `VALIDATED`: a win worth no point, shown « Exempté »,
never with a score. They get no plate.

### Seeding (`eliminationSeeding`)

Who plays whom in the first round of a bracket (qualifiers are always drawn with the constraints):

- `pyramidal` (default): seed = rank in the qualifiers (inside the bracket's slice); the byes go to
  the best seeds, the standard order sets the matchups (`buildPyramidalFirstRound`).
- `random`: the exempt teams are drawn with the seed (usage `bracket`), the others are paired by the
  constrained draw (rematches and clubs, `generatePairsWithContraints`), and the matches are
  shuffled over the positions with the same seed (`buildRandomFirstRound`). The same tournament
  always gives the same tree, but it is fixed after the first round: a rematch or two teams of the
  same club can meet later.

### Who plays where (`EliminationTeamsResolver.slotsOf`, `elimination-teams.utils.ts`)

- **Main / consolations**: at their first round, their slice of the **qualifying** ranking over the
  non-stopped teams (the last `eliminatedAfterQualifying` teams play no elimination match), placed by
  the seeding; then the winners of their previous round, by position.
- **Challenges**: at elimination 2, the losers of the parent's first-round **real** matches (never a
  bye), seeded by their qualifying rank; then like any bracket.
- **Third place**: the two main semi-final losers, one match at position 0, played with the final.

## Teams stopped after the qualifiers

With `eliminatedAfterQualifying = X`, the plan is computed for `N - X` teams and the X last teams of
the qualifying ranking play no elimination match. Their final rank is their qualifying rank: they
come after every bracket team, in section `eliminated_qualifying` (« Éliminés en qualifs »).

## Ranking and player data

- `computeGlobalRanking` (default) seeds the brackets.
- `computeStandings` (override) gives the final ranking. Before any elimination match exists it
  is the single qualifying ranking (`section` and `sectionLabel` are null). Then the teams are
  grouped in blocks: Main (3rd place included), Challenge main, Consolante A, Challenge A,
  Consolante B… (the group order), then `eliminated_qualifying`. Inside a block: how far the team
  went, winner before loser, the score of its last match, then its seed. Each entry has `section`
  (group key, `pools` for a team that reached no bracket without being stopped) and `sectionLabel`
  (French label).
- `computeTeamStatus` feeds `GET /tournaments/:code/teams/:teamCode` (`PlayerTeamDto`):
  `eliminatedAfterQualifying`.

## Phase name and end (`computeTournamentStatus`)

The phase name is the label of the plan round being played (`Phase qualificative x/N`,
`Élimination n`, `Quarts de finale`, `Demi-finales`, `Finale`, with `+ Petite Finale` when the
3rd place match is played in that round); `Tournoi terminé` once completed, empty in draft. The
tournament can finish once every match of the plan's last round is validated; a new session can
be generated while the plan has rounds left.

## Injected dependencies

`PoolService`, `MatchRepository`, `PoolRepository`, `TournamentRepository`.
