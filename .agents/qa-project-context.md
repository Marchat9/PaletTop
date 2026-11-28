# QA Project Context — PaletTop

_Last updated: 2026-11-17 (qa-start run on branch `feat/ranking-spectator-redesign`). Sources cited per line._

## Product
- **Name / purpose:** PaletTop — tournament and training management for the French game "Palet" (CLAUDE.md).
- **Type:** web app (PWA, `frontend/ngsw-config.json`) with a REST + websocket API.
- **URLs:** dev front `http://localhost:4200`, dev API `http://localhost:3000` (observed). Staging/production URLs: unknown; not inspected.
- **Critical user journeys** (derived from routes in `frontend/src/app/app-routes.ts`; business priority not confirmed by the owner):
  1. Admin creates a tournament, registers teams, starts it, launches rounds, enters/corrects scores.
  2. Player joins with tournament + team code, starts and validates a match score.
  3. Spectator follows a tournament live (waiting room → rounds → ranking → elimination tables → finished).
  4. Admin creates a training group and session, checks players in, draws rounds (with plates).
  5. Training player/spectator follow the round and session/club leaderboards.
  6. Structured tournament: qualifying rounds then elimination tables (principale / consolante / challenges).

## Tech Stack
- **Monorepo, two independent apps** (no workspace tool).
- **Frontend:** Angular 21 standalone, NgRx, Angular Material, locale fr-FR (`frontend/package.json`, CLAUDE.md).
- **Backend:** NestJS, TypeORM, PostgreSQL, socket.io realtime gateway (`backend/package.json`, `backend/src/modules/realtime`).
- **Database:** PostgreSQL in Docker (`docker-compose.yml`, container `palet-db` observed running). Migrations in `backend/src/database/migrations`.
- **Hosting:** Docker images pushed to GHCR (`.github/workflows/docker-images.yml`). Production host: unknown.

## Test Stack
### Unit / Component
- **Frontend:** Vitest via `ng test` (`@angular/build` unit-test builder, jsdom). 119 spec files, 800 tests. Executed 2026-11-17.
- **Backend:** Vitest (`backend/vitest.config.ts`). 48 spec files, 314 tests. Executed 2026-11-17.
- Coverage: `npm run test:cov` exists in backend; no coverage threshold configured. Frontend coverage: not configured.
### E2E / Integration
- **None selected yet** — no `playwright.config.*` / `cypress.config.*`. Default recommendation: Playwright (see `playwright-automation`).
- Manual smoke testing done with Playwright MCP against the dev servers (this run).
### API / Visual / Performance
- None selected yet.

## CI/CD
- **GitHub Actions** on PRs to `main` (`.github/workflows/`):
  - `tests.yml` — `npm test` per changed project (Node 22).
  - `lint.yml` — backend `npm run lint`, frontend `npm run format:check` (Prettier only — no ESLint on the frontend).
  - `docker-images.yml` — builds backend/frontend images (so the frontend production build runs here).
  - `codeql.yml`, `dependency-review.yml`, `zizmor.yml`, `labels.yml`.
- What blocks a merge (branch protection): unknown; not inspected.
- No E2E or migration check in CI.

## Environments
- Local: `docker compose up --build` or `npm run start:dev` (migrations auto-run) / `start:devDb` (schema dropped and recreated).
- Staging: unknown. Production: Docker images; parity with local unknown.

## Quality Goals
- No agreed targets found. **Proposed** (solo/early-stage): unit coverage 60% on business logic (strategies, ranking, matchmaking, leaderboard utils), E2E on the top 5 journeys, flake rate < 2%, frontend unit suite < 3 min.
- Observed: frontend suite ~100 s; one timeout-based flake (see Risk Areas).

## Risk Areas
| Area | Risk level | Business impact | Notes |
|------|-----------|-----------------|-------|
| Ranking / standings computation (tournament + training) | Critical (proposed) | Wrong winner displayed | Many rules (victory/GA, bye points, structured tables). Bye score balance already flagged by the owner as a known concern. |
| Byes (exempt teams/players) | Critical (evidenced) | Spectator screens stuck / wrong counters | 2026-11-17: training bye stays `PENDING`, spectator round never reaches "terminé". |
| Realtime broadcasts (websocket) | Important (proposed) | Spectator screens stale | Tournament and training share event names with different payloads (CLAUDE.md). |
| Round generation concurrency | Important (evidenced in code) | Duplicate rounds | Handled by unique constraints + 409 (`tournaments.controller.ts`). |
| DB migrations | Important (proposed) | Startup failure in prod | Hand-written migrations, not checked in CI. |
| Spectator pagination / auto-pager timing | Monitor | Cosmetic | Timer-based UI, hard to unit-test. |
| Excel team import (exceljs/xlsx lazy-loaded) | Monitor (evidenced) | Flaky CI | `team-excel.utils.spec.ts` timed out at 60 s under load, passes alone. |

Incident history: unknown.

## Team
- Solo developer (git author `mathieu`), no dedicated QA (assumption from git history; not confirmed). Ownership model: developer owns all tests; QA = strategy + critical-path E2E.

## Conventions
- Spec files co-located: `*.spec.ts` next to the source (both apps).
- Commits: Conventional (`feat:`/`fix:`/`chore:`), one logical change per commit; branches from `main`.
- E2E selector strategy: none yet. Proposed: ARIA roles + visible French labels (`getByRole('tab', { name: 'Classement' })`), `data-testid` only where text is dynamic.
- Test data: seeded through the public REST API (scripts used this run: tournament with 6–7 teams, training session with 9 players, admin score endpoints).
