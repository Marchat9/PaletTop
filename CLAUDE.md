# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaletTop is a tournament management app for the French game "Palet". It is a monorepo with two independent projects:
- `frontend/` — Angular 21 SPA
- `backend/` — NestJS REST API

## Commands

### Backend (`cd backend`)
```bash
npm run start:dev          # Dev mode with migrations (standard)
npm run start:devDb        # Dev mode with schema sync+reset (APP_ENV=dev-bdd)
npm run build              # Compile TypeScript
npm run lint               # ESLint
npm test                   # Vitest
npm run migration:generate # Generate migration from entity diff
npm run migration:run      # Apply pending migrations
npm run migration:revert   # Revert last migration
```

### Frontend (`cd frontend`)
```bash
npm start                  # Dev server on port 4200
npm run build              # Production build
npm test                   # Run tests with Vitest
```

### Full stack via Docker
```bash
docker compose up --build        # From the repo root: PostgreSQL + backend + frontend
```

## Architecture

### Backend
- **NestJS** with TypeORM + PostgreSQL (port 3000)
- Entities live in `src/entities/` and are auto-discovered via glob
- Business logic organized in `src/modules/`: `tournaments`, `training`, `realtime`,
  `super-admin`, `cleanup`, `health`
- Tournament modes (standard, up-down, championship) are strategies in
  `src/modules/tournaments/strategies/` (see the READMEs there)
- DB config in `src/database/typeorm.config.ts` with two modes:
  - **Normal**: migrations run automatically, no schema sync
  - **dev-bdd** (`APP_ENV=dev-bdd`): drops and recreates schema on startup (for rapid iteration — do not use against data you want to keep)
- Migration files go in `src/database/migrations/`
- Env vars: copy `backend/.env.example` to `backend/.env`

### Frontend
- **Angular 21** standalone components (no NgModules)
- **NgRx** for global state, one slice per feature under `src/app/store/` — notably:
  - `appConfig` — theme, notifications, localStorage cache
  - `tournament` — current tournament data and API call state
  - `training` — training group, session, rounds, leaderboard and participant view
  - `realtime` — websocket connection and broadcast actions (tournament and training streams are kept separate: they share event names with different payloads)
- Store structure: `src/app/store/{feature}/{feature}.actions/reducer/effects/selectors.ts`
- Effects call services (`src/app/services/`) which hit the backend API
- Routes defined in `src/app/app-routes.ts`, grouped by universe:
  - `/accueil` — home page (create/join a tournament or a training)
  - Tournament: `/admin/tournament-creation`, `/admin/tournament[/:tournamentCode]`,
    `/player/tournament[/:tournamentCode/:teamCode]`, `/spectateur[/:tournamentCode]`
  - Training: `/admin/training-creation`, `/admin/training[/:trainingCode]`,
    `/admin/training/:trainingCode/session-creation`,
    `/admin/training/:trainingCode/session/:sessionCode`,
    `/player/training[/:sessionCode/:participantCode]`
  - `/friendly-match`, `/super-admin`
- Only page components read the store and dispatch actions; sub-components communicate through `input()`/`output()`
- Shared UI components in `src/app/shared/`; modals in `src/app/modales/`
- Environment config in `src/environments/environment.base.ts` (extended by dev/prod)
- UI uses Angular Material; locale is set to `fr-FR`
