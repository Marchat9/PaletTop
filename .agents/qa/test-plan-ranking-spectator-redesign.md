# Test Plan — branch `feat/ranking-spectator-redesign`

_Scope: 26 commits vs `main`, 107 files (+4217 / −2131). Strategy: `.agents/qa/test-strategy.md`._

## In scope
- Shared leaderboard (replaces 4 ranking tables), optional podium, player bottom sheet.
- Tournament + training spectator screens rebuilt around phases (waiting / live / break / finished), auto-pagination, progress bar.
- Live registered-teams list on the spectator waiting screen (backend broadcast).
- Structured tournament tables shown as ranking sections; team placed in its table at elimination launch.
- Training match plates (entity + migration `1794100000000-AddTrainingMatchPlate`), shown to players/spectators.
- Admin tournament match rows show the plate number.

## Out of scope
Tournament creation forms, Excel import, super-admin, friendly match.

## Test cases
| # | Case | Type | Priority | Result (2026-11-17) |
|---|------|------|----------|---------------------|
| 1 | Backend unit suite | Unit | P1 | PASS 314/314 |
| 2 | Frontend unit suite | Unit | P1 | PASS 800/800 (1 timeout flake under parallel load, passes alone) |
| 3 | Backend lint + build | Static | P1 | PASS |
| 4 | Frontend Prettier + prod build | Static | P1 | PASS, 5 CSS budget warnings (2 from this branch) |
| 5 | Spectator waiting screen lists registered teams | E2E manual | P1 | PASS |
| 6 | New team appears live without reload | E2E manual | P1 | PASS |
| 7 | Live scores + ranking update on admin score entry | E2E manual | P1 | PASS |
| 8 | Round badge counts validated matches | E2E manual | P1 | FIXED (byes ignored in counter and phase) |
| 9 | Training round reaches "terminé" / break phase when all played | E2E manual | P1 | FIXED (byes ignored in counter and phase) |
| 10 | Mobile: podium switch only on Classement tab | E2E manual | P2 | PASS |
| 11 | Podium toggle hides/shows podium, table re-ranks 1..n | E2E manual | P2 | PASS |
| 12 | Training plates: 1..plateCount, bye without plate | API + E2E | P1 | PASS |
| 13 | Migration applies on an existing DB | Integration | P1 | PASS (dev DB migrated, column present) |
| 14 | Console errors on spectator screens | E2E manual | P2 | PASS (0 errors/warnings) |
| 15 | Structured tournament: elimination tables in ranking | E2E manual | P1 | NOT RUN — needs qualifying rounds completed |
| 16 | Auto-pagination + progress bar with > 1 page | E2E manual | P2 | NOT RUN — needs ~30+ teams |
| 17 | Player session/club leaderboard bottom sheet (mobile) | E2E manual | P2 | NOT RUN |
| 18 | Finished phase (tournament completed / session closed) | E2E manual | P2 | NOT RUN |

## Defect
**Training spectator ignores that a training bye stays `PENDING`.**
- Repro: training session, 9 players, 2 plates → round with 2 matches + 1 bye; validate both matches.
- Expected: badge "Round 1 · terminé" (break phase), counter 2/2.
- Actual: badge stays "Round 1 · 2 / 3 validés", phase stays `live`.
- Cause: `spectator-training-page.ts` `validatedCount`/`matchCount` and `spectatorPhase()` (`utils/spectator.util.ts`) include the bye; the backend never validates training byes (admin page already filters `!match.isBye`).
- Related (debatable, tournament): bye is `VALIDATED` there, so the badge reads "3 / 4 matchs validés" and the mobile tab "Matchs · 4" for 3 real matches.

## Deferred / next
Cases 15–18, then automate 5–9 as the first Playwright specs.
