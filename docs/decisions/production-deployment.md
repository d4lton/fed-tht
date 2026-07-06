# Decision: Production Deployment

## The target shape

Production runs as:

- **Backend on Cloud Run** — Google's way of running a packaged app. It runs the same packaged image built in [Phase 3](specs/phase-3-local-environment.md); Cloud Run just runs that image.
- **Database on Postgres, self-hosted on a small Compute Engine VM** — the local Docker database is development-only; production needs a real one. A self-managed VM running Postgres is chosen over managed Cloud SQL for **cost**: Cloud SQL carries a managed premium (roughly 2–3× a small VM) that isn't worth it for a low-traffic service. It is still plain Postgres, so nothing about the record or how the app reads and writes it changes — the app connects over ordinary TCP either way. The trade accepted: patching and backups become ours (Cloud SQL did them), so the setup adds a scheduled dump to the bucket. If hands-off backups/HA ever matter more than the cost, Cloud SQL is the swap-back — only the database provisioning and the deploy's migration step differ.
- **Images in a cloud storage bucket** — the production side of the image swap point (see [Database and local development environment](decisions/database-and-local-environment.md)), which the storage phase left to build later. A folder on disk locally; a bucket in production, behind the same swap point.
- **Frontend on Firebase Hosting** — serves the built frontend files.
- **The reader** — Cloud Vision turned on for the project, with the app's own identity allowed to call it and to read the secret (see [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)).

## Hostnames: two per environment

Each environment has its own two hostnames — one for the frontend, one for the backend:

- **Local**: both point at the machine (localhost).
- **Production**: they point at Firebase Hosting (frontend) and Cloud Run (backend).

The value is uniformity: the app always talks to "the backend hostname" and always accepts "the frontend hostname"; only what those names point at, and the settings behind them, differ by environment. There is no local-versus-production special case in the connection itself.

Because the two hostnames are different addresses, the frontend's calls to the backend cross addresses, so the backend's accept-the-frontend's-address setting matters — set, per environment, to that environment's frontend hostname.

## A scripted deploy

Deploying is one command — `npm run deploy:production` — that updates the running backend on Cloud Run and the frontend on Firebase Hosting. Scripted rather than by-hand because it is run more than once and a written list is easy to run out of order; the script is also the honest record of what a deploy actually does.

## Set up once, deploy many times

Two different kinds of task, kept apart:

- **One-time setup — codified as Terraform** (`terraform/`): the APIs, the database VM (Postgres installed and configured by its startup-script), the firewall, the image bucket, the service accounts and IAM, the DB-password secret, and the Cloud Run service shell. `terraform apply` provisions the world the app runs in, and `terraform destroy` tears it down — reproducible, not a checklist to run out of order. A few things stay by hand because they don't belong in Terraform: the reader-key secret it *references* (pre-existing), Firebase Hosting (left to the `firebase` CLI), DNS, and the on-VM backup cron.
- **The repeatable deploy** (`npm run deploy:production`): build and update the backend, move the database table shape forward, and build and publish the frontend. This is what changes when the code changes.

**Terraform owns the infrastructure; the deploy owns the code.** The one seam between them is the Cloud Run *image*: Terraform sets a placeholder and *ignores* later changes to it, so the deploy ships the real image and the two never fight over it. One consequence of Terraform managing the DB-password secret's value is that the value is in Terraform state, so the state lives in a private, versioned GCS backend. Both — the Terraform module and the deploy's four steps — are written down as a runbook in `DEPLOY.md` at the repo root (the operational companion to this design page).

## Settled during the build

- **Where the schema moves forward: the deploy command, not app start-up.** The deploy runs the migrations once, against the production database, *before* the new version takes traffic — so start-up migrations are turned **off** in production (`migrationsRun` is on only outside production). The reason is the multi-instance race: Cloud Run can start several copies of the backend at once, and start-up migrations would have them stepping on each other. Locally there is a single instance, so start-up migrations stay on for convenience. This is the deploy-command approach the spec assumed, now settled.
- **Reaching the database — two secure paths, both Google's, no public IP on the VM.** The *running backend* on Cloud Run reaches the VM over the VPC by its **internal IP** (Direct VPC egress; no code change — it is just the database host in config). The *deploy machine*, running the migration step, reaches the same VM through an **IAP tunnel** to its Postgres port. Same database, the connection method differing only by where the connection originates. (Firewall lets Postgres in from the VPC range and the IAP range only.)
- **The production image store is built.** The GCS-backed side of the image swap point is implemented (objects keyed by the same bare reference the disk store uses, authenticated with the service's ADC), so an uploaded image lives in the bucket and survives a backend restart — nothing above the swap point changes between local disk and production bucket.

## Related pages
- [Database and local development environment](decisions/database-and-local-environment.md)
- [Reader provider and the latency budget](decisions/reader-provider-and-latency.md)
- [Frontend stack](conventions/frontend-stack.md)
- [Verification pipeline](architecture/verification-pipeline.md)
