# Infrastructure (Terraform)

Provisions the production infrastructure for fed-tht: the APIs, the Postgres VM
(with Postgres installed and configured by a startup-script), the firewall, the
image bucket, the service accounts and IAM, the DB-password secret, and the
Cloud Run service shell.

**Terraform owns the infrastructure; `npm run deploy:production` ships the
code.** The Cloud Run *image* is the seam: Terraform sets a placeholder and
ignores later changes to it, so the deploy script owns the image and the two
never fight. See `decisions/production-deployment.md` in the wiki for the shape,
and `../DEPLOY.md` for the end-to-end runbook.

## Prerequisites

- `terraform` >= 1.5, `gcloud` (authenticated with rights to create these
  resources, including `iam.serviceAccounts.actAs` on the service accounts it
  attaches to Cloud Run / the VM).
- The reader key already in Secret Manager as `anthropicKeySecret` (referenced,
  not created here).

## Bootstrap the state bucket (once)

State holds the DB password, so the backend bucket must be private with
versioning. Create it before `terraform init`, then set its name in
`versions.tf`:
```bash
gcloud storage buckets create gs://fed-tht-tfstate \
  --location=us-central1 --uniform-bucket-level-access --project fed-tht
gcloud storage buckets update gs://fed-tht-tfstate --versioning --project fed-tht
```

## Apply

```bash
cp terraform.tfvars.example terraform.tfvars   # fill in (gitignored)
export TF_VAR_db_password='choose-a-strong-one' # avoid single quotes
terraform init
terraform apply
```
On first apply the VM boots and its startup-script installs + configures Postgres
(a minute or two). The `terraform output` values feed `scripts/deploy.production.env`
(the `deploy_env_hints` output lists them); `BACKEND_HOSTNAME` is the
`cloud_run_url` output.

Then, from the repo root, ship the code:
```bash
npm run deploy:production
```

## Teardown

```bash
terraform destroy
```
The image bucket has `force_destroy = false`, so empty it first if you mean to
delete it. Secret Manager secrets and the state bucket may need manual cleanup.

## What stays out of Terraform (on purpose)

- **The reader key secret** — pre-existing; referenced by name. `terraform
  import` it if you want TF to own it.
- **Firebase Hosting** — left to the `firebase` CLI (`firebase init` + the
  deploy's publish step).
- **DNS** — add `google_dns_record_set` here if you use Cloud DNS; otherwise set
  records at your registrar.
