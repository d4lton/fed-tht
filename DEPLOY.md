# Deploying to production

Production shape and the *why* live in the Hintertide wiki
(`decisions/production-deployment.md`); this file is the operational runbook.

- **Backend** → Cloud Run (runs the repo's `Dockerfile` image)
- **Database** → Postgres on a small Compute Engine VM (self-managed; cheaper than Cloud SQL). Cloud Run reaches it over the VPC by internal IP; the deploy runs migrations over an IAP tunnel.
- **Images** → a Cloud Storage bucket (the production side of the image swap point)
- **Reader** → Cloud Vision, called with the service's own identity (ADC)
- **Frontend** → Firebase Hosting

> **Self-managed database, on purpose.** A VM running Postgres is markedly cheaper
> than Cloud SQL for a low-traffic service, at the cost of owning patching and
> backups yourself (Cloud SQL did those). Set up at least a scheduled `pg_dump`
> to the bucket (below). If this ever needs hands-off HA/backups more than it
> needs to be cheap, Cloud SQL is the swap-back — only the DB provisioning and
> the deploy's migration step differ.

Two kinds of task, kept apart: **one-time setup** (mostly `terraform apply`,
below) and the **repeatable deploy** (`npm run deploy:production`).

---

## Tools the deploying machine needs

- `terraform` (>= 1.5) — provisions the infrastructure
- `gcloud` (authenticated: `gcloud auth login`) — Terraform uses these creds, and the deploy uses `gcloud`'s IAP tunnel to migrate the VM
- `firebase` (Firebase CLI, authenticated: `firebase login`)
- Node.js + `npm ci` run in both the repo root and `frontend/`

---

## One-time setup (run once, from nothing)

Most of it is one `terraform apply`. The residual manual bits are the reader key,
Firebase Hosting, DNS, and filling in the deploy config.

### 1. Provision the infrastructure with Terraform
`terraform/` creates the APIs, the Postgres VM (with Postgres installed and
configured by its startup-script), the firewall, the image bucket, the service
accounts and IAM, the DB-password secret, and the Cloud Run service shell (the
image is left to the deploy). Full steps — including the one-time state bucket —
are in [`terraform/README.md`](terraform/README.md):
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars     # fill in project, bucket, cors_origin, deployer
export TF_VAR_db_password='choose-a-strong-one'  # avoid single quotes
terraform init && terraform apply
```
`terraform output` then gives you the Cloud Run URL, the VM IP, and the values
for the deploy config (step 6).

> Terraform **references** the reader key secret (`anthropicKeySecret`) rather
> than creating it — do step 2 first if it doesn't exist yet.

### 2. The reader key secret
The reader/fallback key lives in Secret Manager as `anthropicKeySecret` (see
`decisions/database-and-local-environment.md`). If it doesn't exist yet:
```bash
printf '%s' 'sk-ant-...' | gcloud secrets create anthropicKeySecret --data-file=- --project fed-tht
```

### 3. Database backups (you own these now)
Cloud SQL did automated backups; a self-managed VM does not. Add a nightly dump
to the bucket — e.g. a cron entry on the VM (SSH in with
`gcloud compute ssh fed-tht-db --tunnel-through-iap --zone us-central1-a`):
```
0 3 * * * pg_dump fedtht | gzip | gcloud storage cp - gs://fed-tht-images/backups/fedtht-$(date +\%F).sql.gz
```
The VM's service account already has object-write on the bucket (granted by
Terraform).

### 4. Frontend hosting
```bash
cd frontend && firebase init hosting   # public dir: dist, single-page app: yes
```
`frontend/firebase.json` is already committed with those settings.

### 5. Hostnames and DNS
Point the frontend hostname at Firebase Hosting and the backend hostname at
Cloud Run, and set the DNS records; certificates provision themselves. Make sure
`cors_origin` (Terraform) is the frontend's real origin and `BACKEND_HOSTNAME`
(deploy config) is the backend's.

### 6. The deploy config file
```bash
cp scripts/deploy.production.env.example scripts/deploy.production.env
# fill in from `terraform output deploy_env_hints`; add DB_PASSWORD_SECRET and
# FIREBASE_PROJECT (gitignored)
```

---

## The repeatable deploy

```bash
npm run deploy:production
```
which runs `scripts/deploy.sh production` in order:

1. **Backend** — `gcloud run deploy … --source .` builds the image and ships a new version (Terraform ignores the image, so they don't fight).
2. **Schema** — opens an IAP tunnel to the VM and runs `migration:run` (so the schema is current *before* the new version serves traffic — this is why start-up migrations are off in production; multiple instances would race).
3. **Frontend** — builds `frontend/` with `VITE_API_BASE_URL=$BACKEND_HOSTNAME`.
4. **Publish** — `firebase deploy --only hosting`.

## The matching local path

Same shape, local hostnames — nothing here reaches the cloud:

```bash
npm run app:up          # backend + Postgres in Docker (localhost)
npm run migration:run   # move the local schema forward
npm --prefix frontend run dev   # frontend at localhost, VITE_API_BASE_URL defaults to http://localhost:3000
```

The uniform piece is the frontend build: it always calls "the backend hostname"
(`VITE_API_BASE_URL`), which is `localhost:3000` locally and the Cloud Run URL in
production — only the value differs.

---

## Verifying a deploy

- The frontend at its hostname loads and lists applications from the backend.
- Creating an application with real label images returns a result **well under 5 seconds** against the real services.
- An uploaded image survives a backend restart (deploy a new revision) — it's in the bucket, not the container.

## Teardown

`cd terraform && terraform destroy` removes the infrastructure. Empty the image
bucket first (`force_destroy = false`); the secrets and the Terraform state
bucket may need manual cleanup.
