# PaletTop — Frontend

Angular 21 single-page app for **PaletTop**, a tournament management app for the French game
*Palet*. Covers the admin flows (tournament setup, team management, live scoring, ranking) and the
player-facing views (joining a tournament, following a match).

For the backend API, see [`../backend`](../backend). For the full project overview, see the
[root README](../README.md).

## Tech stack

- [Angular 21](https://angular.dev/) — standalone components, signals, no NgModules
- [NgRx](https://ngrx.io/) (`store` + `effects` + `store-devtools`) for global state
- [Angular Material](https://material.angular.dev/) + Angular CDK (dialogs, overlays, layout)
- `socket.io-client` for real-time updates from the backend
- `exceljs` / `xlsx`, lazy-loaded, for the Excel team-import feature

## Prerequisites

- Node.js `20.19+` or `22.12+`
- The [backend](../backend) running and reachable (see its README) — the frontend has no
  standalone mode, it always talks to the API

## Getting started

```bash
npm install
npm start   # ng serve — http://localhost:4200
```

The API base URL is configured in `src/environments/environment.ts` /
`src/environments/environment.base.ts` (`backBaseApiUrl`, defaults to `http://localhost:3000`).

## Building

```bash
npm run build                             # production build, output in dist/
ng build --watch --configuration development   # incremental dev build (npm run watch)
```

## Deploying

The simplest path is the root [`docker-compose.yml`](../docker-compose.yml), which builds this
app's `Dockerfile` alongside the backend and a PostgreSQL container:

```bash
docker compose up --build
```

This runs the Angular dev server inside the container (`ng serve --host 0.0.0.0`), which is fine
for local development but not what you'd want for a real production deployment.

`Dockerfile` is multi-stage: `docker-compose.yml` builds the `dev` target above, but there's also
a `production` target — an Nginx image serving the static production build
(`dist/PaletTop/browser`), with SPA-aware routing (see `nginx.conf`).
[`.github/workflows/docker-images.yml`](../.github/workflows/docker-images.yml) validates it still
builds on every PR, and builds **and publishes** it to GitHub Container Registry as
`ghcr.io/<owner>/<repo>-frontend:<version>` (plus a `latest` tag) whenever a `vX.Y.Z` tag is pushed.

The backend API URL is baked into the build (see `src/environments/environment.prod.ts`). Override
it at build time for your own deployment instead of editing the file:

```bash
docker build --target production --build-arg API_BASE_URL=https://api.example.com .
```

## Testing

```bash
npm test   # ng test — Vitest
```

Runs automatically in CI on every PR via [`tests.yml`](../.github/workflows/tests.yml).
Contributions adding tests for store logic (reducers/effects/selectors) or components are very
welcome.

## Linting & formatting

There is no ESLint configuration for this project yet. Formatting is enforced with Prettier:

```bash
npm run format         # write mode
npm run format:check   # check-only (used in CI-style checks)
```

## Architecture

- Standalone components throughout — no NgModules.
- Global state lives under `src/app/store/<feature>/`, each with its own
  `actions` / `reducer` / `effects` / `selectors` files (`tournament`, `team`, `match`,
  `session`, `ranking`, `app-config`, `realtime`, …). Effects call services in
  `src/app/services/` which hit the backend API.
- Routes are defined in `src/app/app-routes.ts`: `/accueil` (home), `/admin/tournament-creation`,
  `/admin` (admin config), `/player`, `/player/:tournamentCode/:teamCode`.
- Shared, feature-agnostic UI lives in `src/app/shared/` (buttons, inputs, cards, navigation…);
  modals live in `src/app/modales/`.
- Locale is fixed to `fr-FR`; environment config lives in `src/environments/`.

## Contributing

See the [root README](../README.md#contributing) for the full contribution workflow. Before
opening a pull request that touches this project:

```bash
npm run format:check
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

## License

GPL-3.0-only — see [`../LICENSE`](../LICENSE).
