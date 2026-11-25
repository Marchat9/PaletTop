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
| `eliminationPairingMode`    | `random` (default, also when missing) or `dutch`: see Elimination |
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
a win.

### Pairing mode (`eliminationPairingMode`)

Who plays whom inside a group, once its teams are known:

- `random` (default): the constrained draw above.
- `dutch`: the Dutch Swiss pairing of the up-down mode (`pairDutch`,
  `../up-down/dutch-pairing.utils.ts`), from the ranking of **every match played so far**
  (qualifying and elimination, `computeGlobalRanking`), so the seeds move from round to round. All
  the teams of a group are still in the running, so they form one score group: the top half of the
  ranking plays the bottom half (1v5, 2v6, 3v7, 4v8 for 8 teams), not 1v8. The club and rematch
  constraints of the tournament apply first, then are relaxed (`buildDutchLevels`). The bye is
  still the elimination one (fewest byes, then best ranked), unlike the up-down one. Plates follow
  the pairing order: plate 1 is the best ranked team's match.

Best losers are ranked by `rankBestLosers` (`best-losers.utils.ts`): goal average of the
lost match, cumulative ranking, previous matches' goal average walking back, then a random draw.

## Best losers chain

When a bracket is not a power of 2, its first round has fewer teams than the capacity and the plan
brings back `bestLosersIn` of its first-round losers at round 2 (the repêchés). Losers are ranked by
`rankBestLosers` (`best-losers.utils.ts`), each criterion splitting ties of the previous one:

1. goal average of the lost match;
2. rank in the cumulative ranking;
3. goal average of the previous matches, walking back;
4. random draw.

A bracket and its challenge share one ranking per round, so they agree on who was brought back.
The challenge gets the first-round losers that were not repêchés.

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
  `eliminatedAfterQualifying`, and `repechedFrom`, the label of the bracket where the team lost its
  first round and still plays the second one. Losers falling into a challenge are not repêchés.

## Phase name and end (`computeTournamentStatus`)

The phase name is the label of the plan round being played (`Phase qualificative x/N`,
`Élimination n`, `Quarts de finale`, `Demi-finales`, `Finale`, with `+ Petite Finale` when the
3rd place match is played in that round); `Tournoi terminé` once completed, empty in draft. The
tournament can finish once every match of the plan's last round is validated; a new session can
be generated while the plan has rounds left.

## Injected dependencies

`PoolService`, `MatchRepository`, `PoolRepository`, `TournamentRepository`.
