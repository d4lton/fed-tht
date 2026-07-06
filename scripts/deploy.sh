#!/usr/bin/env bash
#
# Repeatable deploy. One command, run by a person — no auto-deploy pipeline.
# Four ordered steps, matching specs/phase-9-deployment.md:
#
#   1. Build the backend image and update the Cloud Run service to run it.
#   2. Move the database's table shape forward (before the new version takes
#      traffic), reaching the Postgres VM over an IAP tunnel.
#   3. Build the frontend with the target backend hostname baked in.
#   4. Publish the frontend build to Firebase Hosting.
#
# The one-time provisioning this assumes (Cloud Run service, the Postgres VM,
# bucket, secrets, IAM, VPC/firewall, DNS) is a separate by-hand checklist — see
# DEPLOY.md.
#
# Usage:   scripts/deploy.sh [environment]      # default: production
# Config:  scripts/deploy.<environment>.env     # copy the .example and fill in
#
# The environment name selects the config file, so this generalizes to other
# cloud targets by adding a deploy.<env>.env. The *local* path is the dev flow,
# not this script (it has no cloud publish steps) — see "matching local path" in
# DEPLOY.md; the uniform piece is the hostname-parameterized frontend build.

set -euo pipefail

ENVIRONMENT="${1:-production}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/scripts/deploy.$ENVIRONMENT.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy scripts/deploy.$ENVIRONMENT.env.example and fill it in." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

need() {
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      echo "Missing required config '$name' — set it in $ENV_FILE" >&2
      exit 1
    fi
  done
}
have() { command -v "$1" >/dev/null 2>&1 || { echo "Required tool '$1' is not installed (see DEPLOY.md)." >&2; exit 1; }; }

need GCP_PROJECT GCP_REGION BACKEND_SERVICE DB_VM_NAME DB_VM_ZONE DB_NAME DB_USER DB_PASSWORD_SECRET \
     BACKEND_HOSTNAME FIREBASE_PROJECT SERVICE_NAME GCS_BUCKET CORS_ORIGINS
have gcloud
have firebase

echo "==> [1/4] Building and deploying the backend to Cloud Run: $BACKEND_SERVICE"
# The service's env vars, service account, VPC egress, secrets and CORS are set
# once during setup and preserved across --source deploys; this just ships the
# new image built from the repo's Dockerfile.
gcloud run deploy "$BACKEND_SERVICE" \
  --project "$GCP_PROJECT" --region "$GCP_REGION" \
  --source "$ROOT" --quiet

echo "==> [2/4] Moving the database schema forward via an IAP tunnel to the Postgres VM"
DB_PASSWORD="$(gcloud secrets versions access latest --secret "$DB_PASSWORD_SECRET" --project "$GCP_PROJECT")"
PROXY_PORT="${PROXY_PORT:-5433}"
# IAP TCP forwarding reaches the VM's Postgres port with no public IP on the VM
# and no inbound rule beyond the IAP range — Google's secure path from here.
gcloud compute start-iap-tunnel "$DB_VM_NAME" 5432 \
  --local-host-port="127.0.0.1:$PROXY_PORT" \
  --zone "$DB_VM_ZONE" --project "$GCP_PROJECT" &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true' EXIT
# Wait for the tunnel to accept connections.
for _ in $(seq 1 30); do
  (exec 3<>"/dev/tcp/127.0.0.1/$PROXY_PORT") 2>/dev/null && { exec 3>&- 3<&-; break; }
  sleep 0.5
done
# Run migrations through the same config path the app uses (NODE_ENV=production
# reads settings from the environment). ANTHROPIC_KEY_SECRET is cleared so config
# loading doesn't fetch the reader key here — migrations only touch the database.
NODE_ENV=production \
  DB_HOST=127.0.0.1 DB_PORT="$PROXY_PORT" \
  DB_NAME="$DB_NAME" DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" \
  SERVICE_NAME="$SERVICE_NAME" PORT="${PORT:-8080}" \
  GCS_BUCKET="$GCS_BUCKET" CORS_ORIGINS="$CORS_ORIGINS" ANTHROPIC_KEY_SECRET="" \
  npm --prefix "$ROOT" run migration:run
kill "$PROXY_PID" 2>/dev/null || true
trap - EXIT

echo "==> [3/4] Building the frontend against $BACKEND_HOSTNAME"
VITE_API_BASE_URL="$BACKEND_HOSTNAME" npm --prefix "$ROOT/frontend" run build

echo "==> [4/4] Publishing the frontend to Firebase Hosting: $FIREBASE_PROJECT"
(cd "$ROOT/frontend" && firebase deploy --only hosting --project "$FIREBASE_PROJECT" --non-interactive)

echo "==> Deploy complete: $ENVIRONMENT"
echo "    backend  → Cloud Run ($BACKEND_SERVICE), schema current"
echo "    frontend → Firebase Hosting ($FIREBASE_PROJECT), calling $BACKEND_HOSTNAME"
