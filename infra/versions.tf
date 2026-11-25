terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # State is local by default (git-ignored). To share it, create a bucket and uncomment:
  # backend "gcs" {
  #   bucket = "<state-bucket>"
  #   prefix = "mongo-murder-mystery"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
