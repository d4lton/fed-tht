# Spec: Phase 1 — Project Skeleton and a Running Service

## Goal

Stand up the project and prove the environment works end to end: it installs, builds, starts, serves one request, runs its tests, and passes linting. No label-checking logic yet — this phase is only the skeleton and "it runs."

## Stack

Per [Tech stack](conventions/tech-stack.md): Node.js + TypeScript, NestJS, ESLint + Prettier, Jest (run on demand, no watch mode). Use Nest's own scaffolding and defaults where they fit.

## Deliverables

1. A scaffolded NestJS project, with ESLint + Prettier and Jest configured (Nest's defaults are fine).
2. The runtime-config setup described below.
3. One health endpoint: `GET /health` returns a small ok response (for example `{ "status": "ok" }`, optionally a version).
4. One test that boots the app and checks `/health` responds with ok — proving the test path works.
5. The build / test / lint commands filled into the local `CLAUDE.md` (they are placeholders until the project exists).

## Runtime config

Note: this is the **runtime** config — secrets, connections, operational settings. It is *not* the label **rules** config (the per-type domain data in [Configuration as declarative data](decisions/configuration-as-declarative-data.md)). Keep the two separate; they must not be wired together.

- Use NestJS's own config module rather than a hand-rolled file reader.
- Load settings from a different source depending on the environment, behind one small loader each:
  - **local dev** → read `config/config.local.json`.
  - **test** → read `config/config.test.json`, or set values in the test setup.
  - **production** → read from GCP Secret Manager.
- The rest of the app reads settings through the config service and never knows the source — the source is swappable behind it, the same idea as the swappable label reader.
- Check required settings at startup, so a missing or malformed value fails when the service boots, not mid-request.
- Real secrets stay out of the repo. `config/config.local.json` is for harmless local settings only; git-ignore it if it ever holds anything private. Production secrets live in GCP.

For this phase the config can be nearly empty — one or two settings is enough to prove the sources load. The GCP loader can be a thin real implementation or a clearly-marked stub; the point of the phase is that the wiring is in place and dev/test load locally.

## Folder shape

Set the folders up so the future pure core — the combine-and-judge logic — has a home that does not import NestJS, per the core-stays-pure rule in [Tech stack](conventions/tech-stack.md) and [Verification pipeline](architecture/verification-pipeline.md). No core logic is written this phase; just leave it a clean place to live so later phases don't have to move things.

## Done when

- install, build, and start all succeed.
- `GET /health` returns ok.
- The test suite runs and the health test passes.
- Lint passes.
- `CLAUDE.md`'s command placeholders are filled in with the real commands.

## Left to decide during the build

- The exact GCP Secret Manager wiring (client library, how secrets are named and grouped).
- Whether test config is a `config.test.json` file or values set in the test setup.
- The exact health-endpoint response body.

## Not in this phase (later specs)

The validation pipeline, the label-reading interface and its stand-in, storage and the application record, the real image reader, the rules config, reason IDs, and the compiled designation list. This phase deliberately contains none of the label-checking logic.

## Related design pages
- [Tech stack](conventions/tech-stack.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [Configuration as declarative data](decisions/configuration-as-declarative-data.md) — the *other* config; keep it separate.
