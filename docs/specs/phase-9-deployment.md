# Spec: Phase 9 — Deployment

## Goal

Make the system deployable to production with one command — `npm run deploy:production` — and build the two production pieces the earlier phases left for later: the bucket-backed image storage and the connection to the managed database. Target shape and reasoning: [Production deployment](decisions/production-deployment.md).

## Build: the two deferred production pieces

1. **The production image store** — the bucket-backed side of the image swap point. Locally, images live in a folder; in production, in a cloud storage bucket. Fill in the production half so an uploaded image is kept in the bucket and fetched back by its reference, behind the same swap point the code already uses — so nothing upstream changes. Which side is used stays the existing config choice.
2. **The managed-database connection** — in production the backend connects to the managed Postgres (Cloud SQL) instead of the local Docker one. The connection settings come from production config; the record and the way the app reads and writes it are unchanged. Use Google's secure method for reaching the managed database from Cloud Run.

## Build: the deploy command

`npm run deploy:production` runs these in order:

1. Build the backend image and update the Cloud Run service to run it (a new version).
2. Move the database table shape forward — run the table-shape steps against the managed database (see the decision below).
3. Build the frontend, with the production backend hostname baked in as the address it calls.
4. Publish the frontend build to Firebase Hosting.

A matching local build path uses the local hostnames, so the same shape works in both places.

## One-time setup (written down, run once — not in the command)

A "first deploy" checklist:

- Create the managed Postgres database, its database and user; put the connection secret in Secret Manager.
- Create the storage bucket for images.
- Turn on the Cloud Vision reader for the project.
- Grant the app's identity its permissions: read the secret, call the reader, reach the managed database, read and write the bucket.
- Point the frontend hostname at Firebase Hosting and the backend hostname at Cloud Run; set the DNS records (the security certificates provision themselves).
- Set the production config: the managed-database connection, the bucket name, and the frontend hostname the backend accepts.

## One decision to settle during the build

**Where the database table shape gets updated.** The lean: the deploy command does it, as step 2 above, so code and table shape move together — which needs the deploying machine to reach the managed database over Google's secure connection. The alternative — running it on the backend's own start-up — is simpler to wire but goes wrong if more than one copy of the backend starts at once. The spec assumes the deploy-command approach; settle it when building.

## Done when

- `npm run deploy:production` builds and updates the backend on Cloud Run, moves the table shape forward, and publishes the frontend to Firebase Hosting — from the one command.
- The deployed frontend, at its hostname, reaches the deployed backend, at its hostname, and a real validation runs end to end and comes back well under five seconds against the real services.
- An uploaded image is kept in the bucket and survives a backend restart — the production image store works.
- The first-deploy checklist is written down and complete enough that someone could stand the whole thing up from nothing.

## Not in this phase

A third environment beyond local and production (a staging tier), and any pipeline that deploys on its own when code changes — the one command, run by a person, is the whole of it for now.

## Related pages
- [Production deployment](decisions/production-deployment.md)
- [Database and local development environment](decisions/database-and-local-environment.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Frontend stack](conventions/frontend-stack.md)
