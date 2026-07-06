# Spec: Phase 3 — Local Environment (Docker Compose with Postgres)

## Goal

Stand up the local development environment — Docker Compose running Postgres — so any rough edges (the Compose setup, the database starting, the app reaching it, the config wiring) surface early while things are still simple. It also packages the app so it can run as a built image inside Compose — an early step toward deploying the service. Nothing stores real data yet; this proves the plumbing.

## What to build (first pass — already built)

1. A Docker Compose setup that runs **Postgres**:
   - A pinned Postgres version.
   - A named place on disk for its data, so the data survives a restart.
   - A development database, user, and a throwaway development password.
2. The database connection settings added to `config/config.local.json` (host, port, database, user, password), pointing at the Compose Postgres — read through the config system from Phase 1.
3. A minimal **reachability check**: extend the existing `/health` endpoint so it also reports whether the app can reach the database. This is what proves the app (running on your machine) can talk to the Compose database through the config.

## Added scope — package the app and run it in Compose

Getting ready for deploy: run the app as a packaged, built thing, not only as loose code on your machine. This is added on top of the first pass above, which is already built — so it *extends* phase 3, it does not redo it.

4. A file that packages the app into one runnable image (its Dockerfile). Do this properly rather than as a throwaway, since this packaged app is essentially what gets deployed later: a lean image, and not run as the all-powerful "root" user.
5. The app added to the Compose setup, built from that file, and run **by default** — a plain start-up brings up the whole app (the app service plus the database). The app is a normal service, not an off-by-default group. For the everyday coding loop, where you want fast reload, start just the database by name and run the app however you prefer — on your machine, or with your code shared into the container. One thing to watch: because a plain start-up runs the app inside Compose, if you are also running it on your machine, start just the database instead, or the two will collide on the same port.
6. A reachability check for the packaged app: with the app running inside Compose (a plain start-up), its `/health` reports the database as reachable from there too.

Note on how the app reaches the database: on your machine it connects to `localhost`; inside Compose it connects by the database's service name, because they are separate programs on Compose's own network. So the connection values differ between the two run modes, and both sets live in local config.

## Notes

- The library the app will use to read and write the database, for real persistence, is **not** chosen here — that is a storage-phase decision. This phase uses only a minimal connection check, which can be replaced later.
- The core is untouched: no combine/judge code reads the database. See [Database and local development environment](decisions/database-and-local-environment.md).
- Keep the throwaway local password in `config.local.json` only; production credentials come from GCP.

## Done when

- Bringing the Compose setup up starts Postgres, and its data survives a restart.
- With the app running on your machine (started alongside just the database), `GET /health` reports the database as reachable; stopping the database makes it report *unreachable* (so the check is real, not hard-coded to say "ok").
- A plain start-up builds and runs the app inside Compose, and its `/health` reports the database as reachable from there too. Starting just the database, for the coding loop, brings up the database without the app.

## Not in this phase

Real persistence (saving and loading application records), image storage, the storage swap point, and the data-access library. Those come with the storage phase. This is only the local environment, a connectivity check, and the packaged app.

## Related pages
- [Database and local development environment](decisions/database-and-local-environment.md)
- [Tech stack](conventions/tech-stack.md)
