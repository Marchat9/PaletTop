# Test Strategy — PaletTop

_Reads `.agents/qa-project-context.md`. One page of decisions; revisit when an E2E suite exists._

## Pyramid
| Layer | Share | Tool | Owns |
|-------|-------|------|------|
| Unit (pure functions, reducers, selectors, strategies, DTO validation) | ~75% | Vitest (both apps, already in place) | Ranking rules, matchmaking/plates, `*.util.ts`, NgRx reducers |
| Component (Angular TestBed) | ~15% | Vitest + TestBed (in place) | Page computed signals (phase, counters), dumb components' inputs/outputs |
| API integration (NestJS + real Postgres) | ~5% | Vitest + Testcontainers or the compose DB — **to add** | Round generation, byes, migrations, realtime emits |
| E2E | ~5% | Playwright — **to add** | The 5 critical journeys, seeded through the REST API |

Rationale: the business logic (standings, byes, plates, phases) is pure and cheap to unit-test; the bugs that slip through sit at the seams (backend status of a bye ↔ frontend computed counters, websocket ↔ store), so a thin API + E2E layer covers what units cannot.

## Quality gates
- **PR (already in CI):** backend lint + tests, frontend Prettier + tests, Docker build.
- **PR (to add):** an E2E smoke job (spectator tournament + training) once Playwright exists; run `migration:run` against an empty Postgres.
- **Release:** all PR gates green, manual exploratory pass on spectator screens (desktop + 390 px mobile), no open Critical risk.

## Entry / exit criteria
- Unit: entry = function or computed signal with a branch on business data; exit = each branch + bye/empty/tie case covered.
- E2E: entry = a journey listed in context Product; exit = happy path green 10 runs in a row (flake < 2%).

## Specific rules
- Every rule that treats byes differently must have a test with a bye on **both** sides (tournament bye = `VALIDATED`, training bye = `PENDING`).
- Timer-based UI (auto-pager, progress bar) is tested with fake timers, never real waits.
- Tests needing lazy-loaded heavy libs (exceljs/xlsx) get an explicit timeout and are kept out of the critical path.
