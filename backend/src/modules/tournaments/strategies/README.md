# Strategy pattern — tournament modes

## Idea

Each tournament mode (`CompetitionMode`) has its own rules for starting the tournament, building
pools, generating sessions, and showing progress. Each mode is a strategy class, so a new mode can
be added without touching the services.

```
TournamentStrategy (abstract)
├── StructuredTournamentStrategy   → CompetitionMode.STANDARD
├── UpDownTournamentStrategy       → CompetitionMode.UP_DOWN
└── ChampionshipTournamentStrategy → CompetitionMode.CHAMPIONSHIP
```

Mode-specific settings live in `tournament.configuration.competitionConfiguration`
(`src/entities/tournament-competition-configuration.entity.ts`). Read them with
`extractCompetitionConfiguration`.

## Abstract class `TournamentStrategy`

| Method                    | Default                                                    | Override     |
| ------------------------- | ---------------------------------------------------------- | ------------ |
| `computeTournamentStatus` | — (abstract)                                               | **Required** |
| `assignTeamsToFirstPools` | Throws `NotImplementedException`                           | **Required** |
| `generateSessionMatches`  | Throws `NotImplementedException`                           | **Required** |
| `prepareTournamentStart`  | No-op                                                      | Optional     |
| `canStartNextSession`     | Session OPEN and all its matches VALIDATED                 | Optional     |
| `canCompleteTournament`   | Tournament ACTIVE and all matches VALIDATED                | Optional     |
| `computeGlobalRanking`    | `rankTeams` (`utils/ranking-calculation.utils.ts`)         | Optional     |
| `computeStandings`        | Same as `computeGlobalRanking` (final ranking shown)       | Optional     |
| `computeTeamStatus`       | `{ eliminatedAfterQualifying: false }` (player team data)  | Optional     |
| `computeTeamHistory`      | VALIDATED matches of the team, mapped to `MatchHistoryDto` | Optional     |
| `assignPlateNumbers`      | Plates 1, 2, 3… (byes get no plate)                        | Optional     |

`prepareTournamentStart`, `assignTeamsToFirstPools` and `generateSessionMatches` save their own
changes and return the saved entities. Callers merge the result instead of reloading from the DB.

## Factory and services

`TournamentStrategyFactory` returns the right strategy for a mode:

```typescript
const strategy = this.strategyFactory.create(tournament.configuration.competitionMode);
await strategy.generateSessionMatches(tournament, session);
```

- **`SessionService`**: `prepareTournamentStart`, `assignTeamsToFirstPools`,
  `generateSessionMatches`, `canStartNextSession`, `canCompleteTournament`
- **`RankingService`**: `computeStandings`, `computeTeamHistory`
- **`ScoreService`** / **`TournamentsService`**: `computeTournamentStatus`

Shared helpers live in `../utils/` (`match.utils.ts`, `draw.utils.ts`, `bye.utils.ts`, …).

## Score calculations

A tournament ranks its teams with one `ScoreCalculation` (`src/enum/tounament.enum.ts`), chosen
among the ones offered for its mode (app setting `score_calculations_by_mode`). The criteria live in
`../utils/ranking-calculation.utils.ts` (`rankTeams`), which takes the tournament id.

| Calculation (value)                                          | Criteria, in order                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Victoires & Goal Average (`victory_goal_average`)            | wins, goal average, points scored, gaps, frozen draw                           |
| Victoires & Meilleure défaite (`victory_best_defeats`)       | wins, worst loss (lower first), goal average, points scored, gaps, frozen draw |
| Victoires & Points marqués (`victory_points_scored`)         | wins, points scored, points conceded (lower first), gaps, frozen draw          |
| Points championnat (`tournament_score`)                      | championship points only: ties keep a shared rank                              |

- **Worst loss**: the largest losing margin (11-13 is 2), 0 without any loss.
- **Gaps**: the gap of every played match, in session order, compared from the last game back. When
  one team has fewer games, the one with more games goes first.
- **Byes** are a win, but are left out of the worst loss and of the gaps. A qualifying bye is
  stored 13-6 (`pointsPerGame` against `clamp(pointsPerGame − 1, 0, cap)`, `bye_loser_score_cap` app
  setting, 6 by default) and counts in points and goal average; elimination and frozen-round byes are
  stored 0-0.
- **Frozen draw**: `fixedDraw(`${tournamentId}:${teamId}`)` (`../utils/fixed-draw.utils.ts`, FNV-1a),
  the lowest hash first; a hash collision falls back to the team id. Nothing is stored, and the
  three victory-based calculations never share a rank.

---

## Adding a new mode

1. **Enum** — add a value to `CompetitionMode` in `src/enum/tounament.enum.ts`.
2. **Configuration** — if needed, add a `…CompetitionConfiguration` class in
   `tournament-competition-configuration.entity.ts`, plus its DTO and a migration.
3. **Strategy** — create `strategies/<mode>/<mode>-tournament.strategy.ts`:

    ```typescript
    export class MyModeTournamentStrategy extends TournamentStrategy {
        override async assignTeamsToFirstPools(tournament: Tournament): Promise<TournamentPool[]> {
            // ...
        }

        override async generateSessionMatches(
            tournament: Tournament,
            session: MatchesSession,
        ): Promise<TournamentMatch[]> {
            // build, save and return the matches
        }

        override computeTournamentStatus(
            tournament: Tournament,
            sessions: MatchesSession[],
        ): TournamentStatusInfo {
            // ...
        }
    }
    ```

    Only override what differs from the default. Put pure logic (phase name, etc.) in a
    `<mode>-session.utils.ts` file so it can be unit-tested.

4. **Factory** — add a `case` in `tournament-strategy.factory.ts`. If the strategy needs a
   NestJS service, inject it in the factory constructor and pass it on.
5. **Docs** — add a `README.md` in the strategy folder.

## Dependencies available in the factory

| Dependency             | Typical use                                |
| ---------------------- | ------------------------------------------ |
| `PoolService`          | Assign teams to pools                      |
| `MatchRepository`      | Create and save matches                    |
| `PoolRepository`       | Load pools, create virtual (bracket) pools |
| `TournamentRepository` | Save tournament changes at start           |

New dependencies must also be providers in `tournaments.module.ts`.
