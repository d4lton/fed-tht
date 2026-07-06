# Decision: Database and Local Development Environment

## Database: Postgres

The application record is small, structured data — an id, the drink type, the brand, the name and address, an imported-or-domestic flag, a pointer to the images, and a few timestamps (see [Application record](interfaces/application-record.md)). That is a natural fit for an ordinary relational database, and Postgres is the straightforward, well-supported choice. It also matches what we would run in production, so local and production behave the same.

Rejected alternatives: a document store (like MongoDB) — the record is structured and relational, so a document store buys nothing and loses easy constraints. SQLite — fine for a prototype, but Postgres costs almost nothing to run locally (below) and avoids a local-versus-production mismatch.

## Local development: Docker Compose runs the local setup

Docker Compose starts several programs together with one command. We use it to run the whole local setup — the app, the database, and later any local stand-in services (like a locally-run image reader) — so a plain start-up brings the whole thing up and no one has to install and launch the pieces by hand. The setup grows as we add pieces.

A plain start-up runs everything, including the app, built from its own packaged image (the same image that gets deployed). For the everyday coding loop, where you want changes to reload quickly, start just the database and run the app on your machine (or with your code shared into the container) — that keeps the fast loop without rebuilding on every change.

Production is not a Compose situation: the built image is deployed to a hosting platform with the real outside services wired in through config. So the Compose default only governs what a plain local start-up does, and running everything is the sensible answer there. What actually changes across environments is not which of our services run, but whether they run against local stand-ins or the real outside services (and the config that goes with each).

## The core never touches the database

Storage lives at the outer edge, behind a swap point — the same idea as the swappable label reader. The combine-and-judge core takes plain data and never reads or writes the database. This is the purity rule already stated in [Tech stack](conventions/tech-stack.md); the database sits outside it, which is also what keeps the core's tests free of any database.

## How it connects

The database connection rides the runtime config already set up: in development it lives in `config.local.json` and points at the Compose database; in production it comes from GCP. The local database password is a throwaway development value, so it is fine in the local file.

## How secrets are sourced

Sensitive values — starting with the Anthropic API key the real reader needs — are **never** read from environment variables and never committed. They are fetched at boot from **GCP Secret Manager**, the same way in every environment. Config carries only a non-sensitive *pointer* to the secret — a Secret Manager resource path such as `projects/<project>/secrets/<name>/versions/latest`, stored as `reader.anthropicKeySecret` (provider-named so a second AI provider can add its own pointer alongside). The secret value itself lives only in Secret Manager.

Why not an environment variable, given the AI SDK reads `ANTHROPIC_API_KEY` by convention? Because that convention is the hazard. If the key came from `ANTHROPIC_API_KEY`, the app would silently adopt whatever key happened to be present in the shell, the CI runner, or the deployment environment — an unrelated personal or other-project key — and start calling (and billing) against it. Sourcing the key only through an explicit Secret Manager pointer removes that ambient-adoption path entirely. The reader is always built with an explicit key string (empty if unresolved), never `undefined`, so the SDK cannot fall back to the environment either.

The fetch **degrades gracefully**. If the pointer is empty, or the fetch fails (no credentials, offline), the app still boots with an empty key and logs a warning; the reader then fails with a clear "no API key configured" message only if it is actually asked to read a label. This preserves the property that the app — and flows that never invoke the reader — boot without any cloud credentials. It also means the costly live-reader tests, which need a real key, are the one place a developer opts in explicitly.

### Credentials (ADC) per environment

The code creates the Secret Manager client with no credentials argument and relies on **Application Default Credentials** — the Google client library's standard discovery, which checks `GOOGLE_APPLICATION_CREDENTIALS`, then a well-known on-disk file, then the compute environment's own service account (via the GCP metadata server). Because the code names no credential path, the same zero-argument client works in all three places:

- **On a developer's machine** (`npm run start`): the file written by `gcloud auth application-default login`.
- **Local Docker** (`docker compose`): a container has none of those by default, so `docker-compose.yml` mounts that same gcloud credentials file into the container read-only and points `GOOGLE_APPLICATION_CREDENTIALS` at it. This lives only in the local Compose file — never baked into the image or shipped anywhere.
- **Production** (Cloud Run / GKE / GCE): nothing is provided. The runtime *is* a GCP compute environment, so ADC discovers the **attached service account** through the metadata server — keyless, rotating credentials, no file to manage or leak. The only production-side requirement is IAM: that service account needs the **Secret Manager Secret Accessor** role on the secret.

Shipping a credentials JSON to production would be the anti-pattern the platform exists to avoid; the local-Docker mount is only a stand-in for the metadata server that a laptop's Docker cannot reach. The same ADC discovery serves the OCR reader's Cloud Vision calls.

Non-secret production settings (ports, bucket names, database host) are still a marked stub reading the process environment; grouping those into a real Secret Manager fetch is out of scope. Only the sensitive key has been moved off the environment.

## Reading and writing the database: TypeORM

The app reads and writes the database through TypeORM — the data-access library Nest leans on and documents most, where you describe the record as a class and it fits the Nest style. With a single tiny table, and the database kept strictly at the edge (the core never touches it), this choice is about what is pleasant to work with while already in Nest — not about performance or architecture. Any of the common libraries would do.

Rejected alternatives: Prisma (very safe, nice workflow, but its own separate setup and steps — more than one small table warrants); a lighter, closer-to-plain-database option (Drizzle) and hand-written access (both fine, but TypeORM is the least friction inside Nest).

Because config loading may now fetch a secret (an async step), the config loader is async, and the TypeORM migration data source awaits it — TypeORM's CLI awaits an exported `Promise<DataSource>`.

## How the schema is created and kept up to date

The one table is created and evolved through TypeORM **migrations**, run against the environment's database on demand — never schema auto-sync, so the real database changes only on purpose (the safe approach for a small, long-lived table). The record's columns are kept to portable types, so the same entity description works against both Postgres and the lightweight in-memory database the tests use — which lets the storage tests run their save/load and whole-flow checks without a live Postgres.

## Images: kept behind a storage swap point

The label images are files, not table rows, so they are kept outside the database, behind a small storage swap point — the same idea as the swappable reader. The swap point does two things: hand it an image, get back a reference; hand it a reference, get back the image. The record in the database stores only the reference, and the flow and the core only ever deal with the reference — never the storage itself.

Which storage sits behind the swap point is a config choice: a folder on disk in development, and Google's file storage in production. So nothing in the flow changes between the two — only the config does.

**Local persistence.** In local Docker the disk store's folder lives on a **named volume**, so uploaded images survive a container rebuild — the same durability the Postgres data has, and the reason both are named volumes rather than container-local files. Without it, `docker compose up --build` wipes every image file while the application records (on their own volume) persist, leaving records that point at images which are gone: serving them 404s and re-running their check fails on unreadable image data. The container also runs as a non-root user, so the Dockerfile creates that folder owned by that user; production doesn't use the disk store at all (images live in GCS), so both concerns are local-only.

## Related pages
- [Application record](interfaces/application-record.md)
- [Tech stack](conventions/tech-stack.md)
- [Verification pipeline](architecture/verification-pipeline.md)
- [The Real Reader — AI SDK and Claude](decisions/real-reader-ai-sdk-and-claude.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
