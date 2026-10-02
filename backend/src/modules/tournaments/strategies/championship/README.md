# ChampionshipTournamentStrategy — Club vs club (CHAMPIONSHIP)

## Idea

Two clubs face each other: a home club and an away club, with the same number of teams each.
Every home team plays every away team once, in a rotation.

## Rules

- Exactly **8 teams** (4 per club). `prepareTournamentStart` checks this and sets
  `maxTeamCapacity` to 8.
- A team belongs to a club through its `club` field.
- All teams are in one pool.

## Configuration

| Field      | Description                  |
| ---------- | ---------------------------- |
| `homeClub` | Club name of the home teams  |
| `awayClub` | Club name of the away teams  |

## Session generation

Home and away teams are sorted by id. In session `n` (index `n - 1`), home team `i` plays away
team `(n - 1 + i) % awayCount`. No draw, no bye. Plates are numbered 1, 2, 3…

The tournament ends after 4 sessions (`8 / 2`): every home team has played every away team.

## Phase name (`phaseName`)

| Tournament state  | Label                 |
| ----------------- | --------------------- |
| Draft / cancelled | _(empty)_             |
| Active            | `Phase x`             |
| Completed         | `Championnat terminé` |

## Ranking

Uses the default `computeGlobalRanking` (sort by the tournament's `scoreCalculation`).

## Injected dependencies

`PoolService`, `MatchRepository`, `TournamentRepository`.
