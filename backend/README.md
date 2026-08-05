# PaletTop — Backend

NestJS REST + WebSocket API for **PaletTop**, a tournament management app for the French game
*Palet*. Handles tournament configuration, team registration, pool/bracket generation, live
scoring, and ranking — backed by PostgreSQL via TypeORM.

For the frontend client, see [`../frontend`](../frontend). For the full project overview, see the
[root README](../README.md).

## Tech stack

- [NestJS](https://nestjs.com/) 11 (Express platform)
- [TypeORM](https://typeorm.io/) + PostgreSQL
- [Socket.IO](https://socket.io/) for real-time updates (`realtime.gateway.ts`)
- `class-validator` / `class-transformer` for request validation

## Prerequisites

- Node.js `20.19+` or `22.12+`
- PostgreSQL `16` (or use the root [`docker-compose.yml`](../docker-compose.yml), which provisions
  one automatically)

## Getting started

```bash
npm install
cp .env.example .env   # adjust DB_* values if not using the defaults below
```

`.env` reference (see [`.env.example`](.env.example)):

| Variable      | Default     | Description                                              |
| ------------- | ----------- | ---------------------------------------------------------- |
| `PORT`        | `3000`      | HTTP port the API listens on                              |
| `DB_HOST`     | `localhost` | PostgreSQL host                                            |
| `DB_PORT`     | `5432`      | PostgreSQL port                                            |
| `DB_USER`     | `postgres`  | PostgreSQL user                                            |
| `DB_PASSWORD` | `postgres`  | PostgreSQL password                                        |
| `DB_NAME`     | `palet`     | PostgreSQL database name                                  |
| `APP_ENV`     | *(unset)*   | Set to `dev-bdd` to drop & resync the schema on every boot instead of running migrations (see below) |

### Running

```bash
npm run start:dev     # watch mode, runs pending migrations on boot
npm run start:devDb   # watch mode, drops & resyncs the schema from entities on every boot
```

Use `start:devDb` only for early local iteration when you don't care about existing data — it
runs with `synchronize: true` and `dropSchema: true` (see `src/database/typeorm.config.ts`). Use
`start:dev` (migrations) everywhere else, including anything resembling shared or persistent data.

The API listens on `http://localhost:3000` by default. See [`../API.md`](../API.md) for the full
HTTP + WebSocket reference.

### Database migrations

```bash
npm run migration:generate   # generate a migration from the current entity diff
npm run migration:create     # scaffold an empty migration file
npm run migration:run        # apply pending migrations
npm run migration:revert     # revert the last migration
```

Migrations live in `src/database/migrations/`.

## Building

```bash
npm run build     # compiles to dist/
npm run start     # runs the compiled build (dist/main.js)
```

## Deploying

The simplest path is the root [`docker-compose.yml`](../docker-compose.yml), which builds this
service's `Dockerfile`, provisions a PostgreSQL container, and wires the two together:

```bash
docker compose up --build
```

This is a **development-oriented** compose file (bind-mounted source, `npm run start:dev`,
throwaway default DB credentials) — it is not hardened for exposing a production deployment
directly to the internet. Set real secrets, put it behind a reverse proxy/TLS, etc.

`Dockerfile` is multi-stage: `docker-compose.yml` builds the `dev` target above, but there's also
a `production` target (`npm ci --omit=dev` + `node dist/main.js`, no dev dependencies or
TypeScript source in the final image) — built automatically by
[`.github/workflows/docker-images.yml`](../.github/workflows/docker-images.yml) on every push to
`main` and published to GitHub Container Registry as `ghcr.io/<owner>/<repo>-backend:latest`. Build
it yourself with `docker build --target production .`.

## Testing

No automated test suite exists yet. If you add one, `@nestjs/testing` + Jest is the conventional
choice for NestJS projects — please wire a `test` script in `package.json` alongside it.

## Linting & formatting

```bash
npm run lint          # ESLint
npm run lint:fix       # ESLint, auto-fixing what it can
npm run format         # Prettier, write mode
npm run format:check   # Prettier, check-only (used in CI-style checks)
```

## Architecture

- Entities live in `src/entities/` and are auto-discovered via glob (see
  `src/database/typeorm.config.ts`).
- Business logic is organized in `src/modules/` — currently `tournaments` (the bulk of the
  domain: teams, pools, matches, sessions, ranking, scoring strategies) and `realtime` (the
  WebSocket gateway).
- Tournament formats (standard bracket vs. up-down) are implemented as interchangeable strategies
  under `src/modules/tournaments/strategies/`.
- `src/database/typeorm.config.ts` exposes two modes: normal (migrations, no sync) and `dev-bdd`
  (drop + resync from entities on every boot).

## Contributing

See the [root README](../README.md#contributing) for the full contribution workflow. Before
opening a pull request that touches this project:

```bash
npm run lint
npm run format:check
npm run build
```

## License

GPL-3.0-only — see [`../LICENSE`](../LICENSE).
