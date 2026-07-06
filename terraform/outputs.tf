output "cloud_run_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "Backend URL — set this (or a custom domain) as BACKEND_HOSTNAME in scripts/deploy.production.env."
}

output "db_vm_internal_ip" {
  value       = google_compute_instance.db.network_interface[0].network_ip
  description = "The Postgres VM's internal IP (already wired into the Cloud Run DB_HOST)."
}

output "images_bucket" {
  value       = google_storage_bucket.images.name
  description = "GCS_BUCKET for label images."
}

output "backend_service_account" {
  value       = google_service_account.app.email
  description = "The backend's service account."
}

output "deploy_env_hints" {
  value = {
    GCP_PROJECT      = var.project_id
    GCP_REGION       = var.region
    BACKEND_SERVICE  = var.backend_service
    DB_VM_NAME       = var.db_vm_name
    DB_VM_ZONE       = var.zone
    DB_NAME          = var.db_name
    DB_USER          = var.db_user
    GCS_BUCKET       = google_storage_bucket.images.name
    CORS_ORIGINS     = var.cors_origin
    BACKEND_HOSTNAME = google_cloud_run_v2_service.api.uri
  }
  description = "Values to copy into scripts/deploy.production.env (DB_PASSWORD_SECRET and FIREBASE_PROJECT you fill in yourself)."
}
