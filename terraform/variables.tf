variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "Region for Cloud Run, the bucket, and the VM's subnet."
}

variable "zone" {
  type        = string
  default     = "us-central1-a"
  description = "Zone for the database VM."
}

variable "backend_service" {
  type        = string
  default     = "fed-tht-api"
  description = "Cloud Run service name for the backend."
}

variable "db_vm_name" {
  type        = string
  default     = "fed-tht-db"
  description = "Name of the Postgres VM."
}

variable "vm_machine_type" {
  type        = string
  default     = "e2-micro"
  description = "VM size. e2-micro is free-tier eligible but tight; e2-small has more headroom."
}

variable "db_name" {
  type        = string
  default     = "fedtht"
  description = "Postgres database name."
}

variable "db_user" {
  type        = string
  default     = "fedtht"
  description = "Postgres user the app connects as."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Postgres password for db_user. Stored in Secret Manager (and in Terraform state — keep the state backend private). Avoid single quotes."
}

variable "db_password_secret_id" {
  type        = string
  default     = "fed-tht-db-password"
  description = "Secret Manager secret name for the DB password (created here)."
}

variable "anthropic_key_secret_id" {
  type        = string
  default     = "anthropicKeySecret"
  description = "Secret Manager secret name for the reader/fallback key. Referenced, not created — it already exists (see decisions/database-and-local-environment.md)."
}

variable "images_bucket" {
  type        = string
  default     = "fed-tht-images"
  description = "GCS bucket for label images (globally unique — pick your own)."
}

variable "service_name" {
  type        = string
  default     = "fed-tht-label-check"
  description = "SERVICE_NAME the app reports in /health."
}

variable "cors_origin" {
  type        = string
  description = "The frontend origin the backend accepts, e.g. https://fed-tht.web.app."
}

variable "deployer_member" {
  type        = string
  description = "The identity that runs deploys, granted IAP tunnel access for the migration step, e.g. \"user:you@example.com\"."
}

variable "vpc_cidr" {
  type        = string
  default     = "10.128.0.0/9"
  description = "The VPC range Postgres accepts connections from (the default network's internal range)."
}
