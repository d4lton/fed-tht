# CLAUDE.md

## What this project is

A backend service that checks beverage-alcohol label images against U.S. TTB
labeling rules. For a given application, an agent uploads the label images; the
service reports either **pass**, or **fail with specific reasons**.

## Where the design lives — read this first

The full design (what to build and why) lives in the Hintertide wiki, project
`019f1f9b-812b-705d-88a5-a4c37af2d02b`. That wiki is the source of truth — read
from it rather than guessing, and put design detail there, not here. Good entry
points:

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
- `decisions/real-reader-ai-sdk-and-claude.md` — the real label reader (AI SDK +
  Claude, fixed-shape output)
- `decisions/database-and-local-environment.md` — Postgres, TypeORM, the image
  storage swap point, and the local Compose setup
- `conventions/testing-strategy.md` — how it is tested

Build instructions live under `specs/` in the same project. Work from those.

## Stack

Node.js + TypeScript, NestJS, ESLint + Prettier, Jest (run on demand — no watch
mode), TypeORM + Postgres for storage, Vercel's AI SDK for the label reader.

## Rules that must never be broken

1. **The reader only describes.** The AI reads a label and reports what it sees.
   It never decides pass or fail. Every pass/fail decision is made by plain,
   rule-based code — same input, same result.
2. **The judging logic stays pure.** Each judging method takes everything it needs
   as arguments and returns a result. It does not reach into the request, storage,
   the network, or the framework. The pure core lives under `src/core/` and must
   not import NestJS.
3. **The rules never say where things are.** The rules describe what a field is and
   when it is required — never where it sits on the label. Finding text anywhere on
   the image is the reader's job.
4. **Every check has a failing test.** For each check there is a test that makes it
   fail, not only one that makes it pass. A check that cannot fail is not tested.

## Build and test commands

- Install: `npm install`
- Build: `npm run build`
- Start (local dev): `npm run start` (or `npm run start:dev` to watch)
- Run tests: `npm test` (unit) and `npm run test:e2e` (boots the app). The costly
  "reading tests" call the real model and run only when `ANTHROPIC_API_KEY` is
  set; otherwise they skip.
- Lint: `npm run lint` (add `:fix` to auto-fix)
- Format: `npm run format` (or `npm run format:check`)
- Whole app in Compose: `npm run app:up` builds the `Dockerfile` image and runs
  the app plus Postgres (`app:down` stops it, `app:logs` tails it).
- Database only (coding loop): `npm run db:up` starts just Postgres (`db:down`
  stops everything, `db:reset` also deletes the data volume, `db:logs` tails it).
- Database schema: `npm run migration:run` applies the TypeORM migrations
  (`migration:revert` rolls the last one back).

The runtime-config source is selected by `NODE_ENV`: `local` (default) reads
`config/config.local.json`, `test` reads `config/config.test.json`, `production`
reads from GCP (a stub in `src/config/loaders/gcp.loader.ts`). How the app runs
locally and reaches the database is design — see
`decisions/database-and-local-environment.md`.
