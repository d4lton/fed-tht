# The production infrastructure for fed-tht. Provisions the world the app runs
# in — APIs, the Postgres VM, firewall, image bucket, service accounts + IAM,
# secrets, and the Cloud Run service shell. It does NOT ship application code:
# `npm run deploy:production` builds the image, migrates, and publishes the
# frontend. The one seam is the Cloud Run image, which this manages a placeholder
# for and then ignores (see the lifecycle block), so the two never fight.

locals {
  apis = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "iap.googleapis.com",
    "secretmanager.googleapis.com",
    "vision.googleapis.com",
  ]

  # Non-secret runtime config for Cloud Run. PORT is intentionally omitted —
  # Cloud Run sets it itself (to the container port) and rejects it as a
  # user-provided env var; the app reads that injected PORT. DB_PASSWORD is wired
  # from the secret separately (below).
  env_vars = {
    NODE_ENV             = "production"
    DB_HOST              = google_compute_instance.db.network_interface[0].network_ip
    DB_PORT              = "5432"
    DB_NAME              = var.db_name
    DB_USER              = var.db_user
    SERVICE_NAME         = var.service_name
    GCS_BUCKET           = google_storage_bucket.images.name
    ANTHROPIC_KEY_SECRET = "projects/${var.project_id}/secrets/${var.anthropic_key_secret_id}/versions/latest"
    CORS_ORIGINS         = var.cors_origin
  }
}

# --- APIs -----------------------------------------------------------------

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# --- Secrets --------------------------------------------------------------

# The DB password: both the container and the value are managed here (so it is
# in Terraform state — the state backend must stay private).
resource "google_secret_manager_secret" "db_password" {
  secret_id = var.db_password_secret_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# The reader/fallback key already exists in Secret Manager; it is referenced by
# name (for the IAM grant and the env pointer), not created here.

# --- Image bucket ---------------------------------------------------------

resource "google_storage_bucket" "images" {
  name                        = var.images_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  depends_on = [google_project_service.apis]
}

# --- Service accounts -----------------------------------------------------

resource "google_service_account" "app" {
  account_id   = "fed-tht-api"
  display_name = "fed-tht backend (Cloud Run)"
}

resource "google_service_account" "db_vm" {
  account_id   = "fed-tht-db-vm"
  display_name = "fed-tht Postgres VM"
}

# --- IAM: the backend service account -------------------------------------

resource "google_secret_manager_secret_iam_member" "app_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

resource "google_secret_manager_secret_iam_member" "app_anthropic" {
  secret_id = var.anthropic_key_secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_service_usage" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer" # lets ADC bill Vision here
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_storage_bucket_iam_member" "app_images" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}

# --- IAM: the VM service account (fetch the password, write backups) ------

resource "google_secret_manager_secret_iam_member" "vm_db_password" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.db_vm.email}"
}

resource "google_storage_bucket_iam_member" "vm_backups" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.db_vm.email}"
}

# --- IAM: the deployer (IAP tunnel for the migration step) ----------------

resource "google_project_iam_member" "deployer_iap" {
  project = var.project_id
  role    = "roles/iap.tunnelResourceAccessor"
  member  = var.deployer_member
}

# --- Database VM ----------------------------------------------------------

resource "google_compute_instance" "db" {
  name         = var.db_vm_name
  machine_type = var.vm_machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network    = "default"
    subnetwork = "default"
    # No access_config block → no external IP.
  }

  service_account {
    email  = google_service_account.db_vm.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = templatefile("${path.module}/startup-postgres.sh.tftpl", {
    project_id         = var.project_id
    db_password_secret = var.db_password_secret_id
    db_name            = var.db_name
    db_user            = var.db_user
    vpc_cidr           = var.vpc_cidr
  })

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_iam_member.vm_db_password,
  ]
}

# --- Firewall -------------------------------------------------------------

resource "google_compute_firewall" "postgres_internal" {
  name          = "allow-postgres-internal"
  network       = "default"
  direction     = "INGRESS"
  source_ranges = [var.vpc_cidr]

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }
}

resource "google_compute_firewall" "iap" {
  name          = "allow-iap"
  network       = "default"
  direction     = "INGRESS"
  source_ranges = ["35.235.240.0/20"] # Google's IAP range

  allow {
    protocol = "tcp"
    ports    = ["22", "5432"]
  }
}

# --- Outbound internet for the VM (Cloud NAT) -----------------------------
# The VM has no external IP (nothing inbound from the internet), but it still
# needs *outbound* internet to install Postgres from the Debian mirrors. Cloud
# NAT provides that — the VM stays unreachable from outside while apt works.

resource "google_compute_router" "router" {
  name    = "fed-tht-router"
  region  = var.region
  network = "default"

  depends_on = [google_project_service.apis]
}

resource "google_compute_router_nat" "nat" {
  name                               = "fed-tht-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# --- Cloud Run service (shell; deploy.sh ships the image) -----------------

resource "google_cloud_run_v2_service" "api" {
  name                = var.backend_service
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.app.email

    vpc_access {
      network_interfaces {
        network    = "default"
        subnetwork = "default"
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    containers {
      # Placeholder — `npm run deploy:production` ships the real image; this field
      # is ignored on later applies (lifecycle below), so TF and the deploy don't
      # fight over the image.
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      dynamic "env" {
        for_each = local.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # Terraform provisions the service once (this template — env, VPC egress,
  # secret, service account — and a placeholder image); the deploy owns it
  # thereafter. The whole template is ignored, not just the image, so Terraform
  # never re-deploys a revision and never blocks an apply waiting on the
  # deploy's latest revision to become healthy. Trade-off: after creation,
  # changes to the runtime env here don't propagate — change them via the deploy
  # (or `terraform apply -replace` this service to re-provision from scratch).
  lifecycle {
    ignore_changes = [
      template,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.app_db_password,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
