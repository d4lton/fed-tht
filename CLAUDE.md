# CLAUDE.md

## What this project is

A backend service that checks beverage-alcohol label images against U.S. TTB
labeling rules. For a given application, an agent uploads the label images; the
service reports either **pass**, or **fail with specific reasons**.

## Where the design lives — read this first

The full design (what to build and why) lives in the Hintertide wiki, project
`019f1f9b-812b-705d-88a5-a4c37af2d02b`. That wiki is the source of truth — read
from it rather than guessing. Good entry points:

- `concepts/single-authority-principle.md` — what a label is checked against, and
  where expected values come from
- `architecture/verification-pipeline.md` — the four steps: load the application,
  read each image, combine the reads, judge
- `interfaces/application-record.md` — the stored application and the few things
  it holds
- `interfaces/label-reading-report.md` — what the reader hands back for one image
- `interfaces/validation-result.md` — the shape of a result (pass, or fail with
  reasons)
- `interfaces/validation-service-boundaries.md` — the endpoint and the service
  methods
- `decisions/anchored-extraction.md` and `decisions/class-type-designation.md` —
  how each field is found and checked
- `decisions/configuration-as-declarative-data.md` — how the rules are stored as
  plain data
- `conventions/testing-strategy.md` — how it is tested

Build instructions live under `specs/` in the same project. Work from those.

## Stack

Node.js + TypeScript, NestJS, ESLint + Prettier, Jest (run on demand — no watch
mode).

## Rules that must never be broken

1. **The reader only describes.** The AI reads a label and reports what it sees.
   It never decides pass or fail. Every pass/fail decision is made by plain,
   rule-based code — same input, same result.
2. **The judging logic stays pure.** Each judging method takes everything it needs
   as arguments and returns a result. It does not reach into the request, storage,
   the network, or the framework.
3. **The rules never say where things are.** The rules describe what a field is and
   when it is required — never where it sits on the label. Finding text anywhere on
   the image is the reader's job.
4. **Every check has a failing test.** For each check there is a test that makes it
   fail, not only one that makes it pass. A check that cannot fail is not tested.

## Build and test commands

- Install: `npm install`
- Build: `npm run build`
- Start (local dev): `npm run start` (or `npm run start:dev` to watch)
- Run tests: `npm test` (unit) and `npm run test:e2e` (boots the app)
- Lint: `npm run lint` (add `:fix` to auto-fix)
- Format: `npm run format` (or `npm run format:check`)
- Whole app in Compose: `npm run app:up` builds the `Dockerfile` image and runs
  the app plus Postgres (a plain start-up; `app:down` stops it, `app:logs` tails
  it). This is `docker compose up -d --build`.
- Database only (coding loop): `npm run db:up` starts just Postgres
  (`db:down` stops everything keeping data; `db:reset` also deletes the data
  volume; `db:logs` tails it).

Two ways to run locally, and the database address differs between them:

- **Coding loop (fast reload):** `npm run db:up` (Postgres only), then the app on
  your machine with `npm run start` — the app reaches the database at
  `localhost`.
- **Whole app in Compose:** `npm run app:up` runs the app as its built image
  alongside Postgres, reaching the database by service name (`DB_HOST=postgres`
  overrides the file's localhost). Don't also run it on your machine at the same
  time — both bind port 3000.

Both sets of connection values are local config. `GET /health` reports database
reachability (`database.reachable`) so you can confirm the wiring either way. The
image is multi-stage and runs as the non-root `node` user; it is essentially what
gets deployed later. The persistence library is deliberately not chosen yet
(storage phase); Phase 3 uses only a minimal `SELECT 1` reachability check under
`src/database/`.

The environment selects the runtime-config source via `NODE_ENV`:
`local` (default) reads `config/config.local.json`, `test` reads
`config/config.test.json`, `production` reads from GCP Secret Manager
(currently a clearly-marked stub in `src/config/loaders/gcp.loader.ts`).
The pure compliance core lives under `src/core/` and must not import NestJS.

## The label reader

The reader is the one part that talks to the outside world; it fills a swappable
slot (`LabelReader` in `src/reader/`). The stand-in (`StandInReader`) returns
pre-set reads for fast, free tests. The real reader (`ClaudeLabelReader`) reads
an actual image by asking Claude through **Vercel's AI SDK** (`ai` +
`@ai-sdk/anthropic`), constrained to the fixed label-report shape via
`generateObject` — a reply that doesn't fit fails plainly. Provider and model
(Haiku) are config choices; the API key comes from config, supplied in dev via
`ANTHROPIC_API_KEY` (kept out of the repo — `config.local.json` holds an empty
default). The AI SDK is a deliberate design choice for provider-swappability and
fixed-shape output — do not swap it for the raw Anthropic SDK.

The costly "reading tests" that actually call the model are gated: they run only
when `ANTHROPIC_API_KEY` is set (`ANTHROPIC_API_KEY=sk-... npm test`); otherwise
they skip. The bulk of coverage is the cheap hand-written-report tests that never
call the model.
