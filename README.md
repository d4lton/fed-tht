# fed-tht — TTB label check

A backend service that checks beverage-alcohol label images against U.S. TTB
labeling rules. For a given application, an agent uploads the label images and
the service reports **pass**, or **fail with specific reasons**. A small React
screen (`frontend/`) drives it.

The full design lives in `docs/` (an export of the project wiki, the source of
truth); `CLAUDE.md` is the short orientation.

## Prerequisites

- **Node.js 20+** and npm
- **Docker** (for the local Postgres) — Docker Desktop or equivalent
- **gcloud CLI** — only needed to run an actual label validation. The default
  reader is Google Cloud Vision, so reading a label requires Google credentials
  (see [The label reader](#the-label-reader) below). The service still boots and
  serves without it; a validation only fails at the point the reader is used.

## Setup and run (local)

```bash
# 1. Install backend dependencies
npm install

# 2. Start Postgres (Docker) and create the schema
npm run db:up
npm run migration:run

# 3. Start the backend (watch mode) — serves http://localhost:3000
npm run start:dev

# 4. In another terminal, start the frontend — http://localhost:5173
cd frontend
npm install
npm run dev
```

The frontend calls the backend at `http://localhost:3000` by default
(`VITE_API_BASE_URL`); no extra config is needed for the local pair above.

Local settings come from `config/config.local.json` (selected by `NODE_ENV`,
which defaults to `local`). It holds harmless defaults only — Postgres on
`localhost`, images written to `./var/images`. No secrets live in the repo.

### The label reader

The default reader is **Google Cloud Vision** (OCR). To run a real validation
locally you need Application Default Credentials for a GCP project with the
Cloud Vision API enabled:

```bash
gcloud auth application-default login
```

The reader's model-fallback key is read from GCP Secret Manager via a
non-sensitive pointer in `config.local.json` (`anthropicKeySecret`) — never from
an environment variable. If the credentials or secret are absent, the app logs a
warning and still boots; a validation then fails clearly when the reader runs.

### Everything in Docker (optional)

To run the backend and Postgres together in Docker instead of step 3:

```bash
npm run app:up     # build + start app + Postgres   (app:down stops, app:logs tails)
```

This mounts your local gcloud credentials into the container read-only so the
reader works the same as `npm run start`.

## Tests

```bash
npm test           # unit tests — in-memory DB, no Docker or GCP needed
npm run test:e2e   # boots the app and exercises the endpoints
```

The costly "reading tests" call the real model and run only when
`ANTHROPIC_API_KEY` is set; otherwise they skip.

## Other useful commands

| Command | What it does |
|---|---|
| `npm run build` | Compile the backend (`nest build`) |
| `npm run lint` | ESLint (`lint:fix` to auto-fix) |
| `npm run db:reset` | Stop Postgres and delete its data volume |
| `npm run migration:revert` | Roll back the last migration |

Deploying to production (Cloud Run + a Postgres VM + Firebase Hosting) is a
separate flow — see [`DEPLOY.md`](DEPLOY.md).
