terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Remote state in GCS. State holds secret values (the DB password), so this
  # bucket must be private with uniform access + versioning — create it once by
  # hand before the first `terraform init` (see README.md), then change the name
  # here to match.
  backend "gcs" {
    bucket = "fed-tht-tfstate"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
