# PaletTop

**PaletTop** is a tournament management app for _Palet_, a traditional French game played with
metal pucks. It handles the parts that are usually a hassle to run by hand: team registration,
pool/bracket draws, live score tracking, and rankings — from a phone or a laptop, for both the
tournament admin and the players.

🚀 **Live demo:** the app is currently available at [palettop.marchat.fr.eu.org](http://palettop.marchat.fr.eu.org/).

## Highlights

- **Tournament setup** — standard bracket or up-down formats, configurable pool count, qualifying
  rounds, and points-per-game rules.
- **Team management** — add teams one at a time, edit or remove them, or bulk-import a whole
  roster from an Excel file (a styled, pre-filled template is generated for you, and `.xlsx`,
  `.xlsm`, `.xls`, `.ods`, and `.csv` are all accepted on import).
- **Live scoring** — real-time score updates over WebSocket, visible to admins and players alike
  as matches happen.
- **Pool rankings & standings** — computed automatically as sessions complete.
- **Player view** — players join with a team code and follow their own matches and history without
  needing an account.
- **Mobile-friendly admin** — built with a non-technical, on-the-go admin in mind (large touch
  targets, bottom sheets on small screens, plain-language error messages).

## Tech stack

| Layer    | Stack                                                        |
| -------- | ------------------------------------------------------------ |
| Frontend | Angular 21 (standalone, signals), NgRx, Angular Material/CDK |
| Backend  | NestJS 11, TypeORM, PostgreSQL, Socket.IO                    |
| Infra    | Docker Compose (Postgres + backend + frontend)               |

## Quick start

```bash
git clone <this-repo-url>
cd palettop
docker compose up --build
```

- Frontend: [http://localhost:4200](http://localhost:4200)
- Backend API: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: `localhost:5432` (`postgres` / `postgres`, database `palet`)

This spins up the whole stack with throwaway default credentials — it's meant for trying the app
out and for local development, not for exposing directly to the internet. For running each part
on its own (with hot reload, without Docker), see the sub-project READMEs below.

## Project structure

```
palettop/
├── backend/                  NestJS REST + WebSocket API — see backend/README.md
├── frontend/                 Angular admin/player web client — see frontend/README.md
├── API.md                    HTTP + WebSocket API reference
└── docker-compose.yml        Local dev stack — builds both apps from source
```

- [`backend/README.md`](backend/README.md) — setup, running, migrations, architecture.
- [`frontend/README.md`](frontend/README.md) — setup, running, building, architecture.
- [`API.md`](API.md) — endpoint and WebSocket event reference for both clients.

## CI

GitHub Actions runs on every pull request against `main`:

| Workflow                                                           | What it does                                                                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`lint.yml`](.github/workflows/lint.yml)                           | ESLint (backend) / Prettier check (frontend) — only for the project(s) the PR actually touches                              |
| [`tests.yml`](.github/workflows/tests.yml)                         | Runs each project's test suite, same touched-project detection                                                              |
| [`docker-images.yml`](.github/workflows/docker-images.yml)         | Validates the Docker image(s) a PR touches still build; builds **and publishes** both to GHCR when a `vX.Y.Z` tag is pushed |
| [`labels.yml`](.github/workflows/labels.yml)                       | Auto-labels the PR `frontend` / `backend` / `ci` based on the paths it touches                                              |
| [`codeql.yml`](.github/workflows/codeql.yml)                       | Static security analysis (JavaScript/TypeScript), plus a weekly scheduled scan                                              |
| [`dependency-review.yml`](.github/workflows/dependency-review.yml) | Flags newly introduced vulnerable or license-incompatible dependencies                                                      |
| [`zizmor.yml`](.github/workflows/zizmor.yml)                       | Security linting for the workflow files themselves                                                                          |

## Contributing

Contributions are welcome — bug reports, feature ideas, or pull requests.

1. **Fork** the repository and create a branch off `main` (`feat/short-description`,
   `fix/short-description`, …).
2. Make your change in the relevant project (`frontend/` and `backend/` are independent — see
   their READMEs for setup).
3. Before opening a PR, run that project's checks locally (typecheck, lint/format, tests, build —
   each README lists the exact commands). CI runs the lint and test checks automatically on every
   PR (see [CI](#ci) above), but catching issues locally first saves a round trip.
4. Commit messages follow a loose [Conventional Commits](https://www.conventionalcommits.org/)
   style already used throughout the history — `feat: ...`, `fix: ...`, `chore: ...`, etc.
5. Open a **Pull Request** against `main` describing what changed and why. Link any related issue.

For anything more than a small fix, opening an issue first to discuss the approach is appreciated
but not required.

## License

Licensed under the [GNU GPL v3.0](LICENSE).
