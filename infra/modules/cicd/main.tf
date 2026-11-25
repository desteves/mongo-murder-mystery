variable "project_id" { type = string }
variable "project_number" { type = string }
variable "region" { type = string }
variable "github_owner" { type = string }
variable "github_repo" { type = string }

locals {
  subs_backend = {
    _AR_HOSTNAME   = local.ar_host
    _DEPLOY_REGION = var.region
    _PLATFORM      = "managed"
    _SERVICE_NAME  = "mmm-be"
    _TRIGGER_ID    = "4e7a9e11-c44a-4dbd-a23d-7a8228bb4fe6"
  }
  tags_backend = ["gcp-cloud-build-deploy-cloud-run", "gcp-cloud-build-deploy-cloud-run-managed", "mmm-be"]
  subs_mcp = {
    _AR_HOSTNAME   = local.ar_host
    _AR_PROJECT_ID = var.project_id
    _AR_REPOSITORY = "cloud-run-source-deploy"
    _DEPLOY_REGION = var.region
    _PLATFORM      = "managed"
    _SERVICE_NAME  = "mmm-mcp"
    _TRIGGER_ID    = "a4f79735-f682-495c-a10d-05949cba988a"
  }
  tags_mcp = ["gcp-cloud-build-deploy-cloud-run", "gcp-cloud-build-deploy-cloud-run-managed", "mmm-mcp"]
  subs_frontend = {
    _AR_HOSTNAME   = local.ar_host
    _DEPLOY_REGION = var.region
    _PLATFORM      = "managed"
    _SERVICE_NAME  = "mongo-murder-mystery-fe"
    _TRIGGER_ID    = "357ce857-d5eb-428c-8227-35a8d8128b20"
    _API_BASE_URL  = "https://mmm-be-${var.project_number}.${var.region}.run.app"
  }
  tags_frontend = ["gcp-cloud-build-deploy-cloud-run", "gcp-cloud-build-deploy-cloud-run-managed", "mongo-murder-mystery-fe"]

  deployer = "projects/${var.project_id}/serviceAccounts/${var.project_number}-compute@developer.gserviceaccount.com"
  ar_host  = "${var.region}-docker.pkg.dev"
  image    = "$_AR_HOSTNAME/$PROJECT_ID/cloud-run-source-deploy/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA"

  # Same three steps for every service: build, push, point Cloud Run at the new image (labels carry the commit).
  update_args = [
    "run", "services", "update", "$_SERVICE_NAME", "--platform=managed", "--image=${local.image}",
    "--labels=managed-by=gcp-cloud-build-deploy-cloud-run,commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=$_TRIGGER_ID",
    "--region=$_DEPLOY_REGION", "--quiet",
  ]
}

# ---------------------------------------------------------------- backend
resource "google_cloudbuild_trigger" "backend" {
  project            = var.project_id
  location           = "global"
  name               = "MMM-BACKEND"
  description        = "Build and deploy to Cloud Run service mmm-be on push to \"^main$\""
  service_account    = local.deployer
  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"
  tags               = local.tags_backend

  github {
    owner = var.github_owner
    name  = var.github_repo
    push { branch = "^main$" }
  }

  substitutions = local.subs_backend

  build {
    substitutions = local.subs_backend
    tags          = local.tags_backend
    timeout       = "600s" # the effective default, made explicit
    images        = [local.image]
    step {
      id   = "Build"
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "--no-cache", "-t", local.image, "app-backend", "-f", "app-backend/Dockerfile"]
    }
    step {
      id   = "Push"
      name = "gcr.io/cloud-builders/docker"
      args = ["push", local.image]
    }
    step {
      id         = "Deploy"
      entrypoint = "gcloud"
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
      args       = local.update_args
    }
    options {
      logging             = "CLOUD_LOGGING_ONLY"
      substitution_option = "ALLOW_LOOSE"
    }
  }
}

# ---------------------------------------------------------------- MCP server
resource "google_cloudbuild_trigger" "mcp" {
  project            = var.project_id
  location           = "global"
  name               = "MMM-MCP"
  description        = "Build and deploy to Cloud Run service mmm-mcp on push to \"^main$\""
  service_account    = local.deployer
  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"
  tags               = local.tags_mcp

  github {
    owner = var.github_owner
    name  = var.github_repo
    push { branch = "^main$" }
  }

  substitutions = local.subs_mcp

  build {
    substitutions = local.subs_mcp
    tags          = local.tags_mcp
    timeout       = "600s" # the effective default, made explicit
    images        = ["$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA"]
    step {
      id   = "Build"
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "--no-cache", "-t", "$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA", "app-mcp", "-f", "app-mcp/Dockerfile"]
    }
    step {
      id   = "Push"
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA"]
    }
    step {
      id         = "Deploy"
      entrypoint = "gcloud"
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
      args = [
        "run", "services", "update", "$_SERVICE_NAME", "--platform=managed",
        "--image=$_AR_HOSTNAME/$_AR_PROJECT_ID/$_AR_REPOSITORY/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA",
        "--labels=managed-by=gcp-cloud-build-deploy-cloud-run,commit-sha=$COMMIT_SHA,gcb-build-id=$BUILD_ID,gcb-trigger-id=$_TRIGGER_ID",
        "--region=$_DEPLOY_REGION", "--quiet",
      ]
    }
    options {
      logging             = "CLOUD_LOGGING_ONLY"
      substitution_option = "ALLOW_LOOSE"
    }
  }
}

# ---------------------------------------------------------------- frontend
# FIX: the frontend reads VITE_MMM_API_BASE_URL / VITE_MMM_API_KEY at BUILD time (no fallbacks), but the original
# trigger passed no build args, so the shipped bundle had baseURL "" and an empty x-api-key. Both are now passed;
# the key comes from Secret Manager (mmm-fe-api-key) through Cloud Build's secret support.
resource "google_cloudbuild_trigger" "frontend" {
  project            = var.project_id
  location           = "global"
  name               = "MMM-FRONTEND"
  description        = "Build and deploy to Cloud Run service mongo-murder-mystery-fe on push to \"^main$\""
  service_account    = local.deployer
  include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"
  tags               = local.tags_frontend

  github {
    owner = var.github_owner
    name  = var.github_repo
    push { branch = "^main$" }
  }

  substitutions = local.subs_frontend

  build {
    substitutions = local.subs_frontend
    tags          = local.tags_frontend
    timeout       = "600s" # the effective default, made explicit
    images        = [local.image]
    step {
      id         = "Build"
      name       = "gcr.io/cloud-builders/docker"
      entrypoint = "bash"
      args = [
        "-c",
        "docker build --no-cache --build-arg VITE_MMM_API_BASE_URL=$_API_BASE_URL --build-arg VITE_MMM_API_KEY=$$VITE_MMM_API_KEY -t ${local.image} app-frontend/murdermystery -f app-frontend/murdermystery/Dockerfile",
      ]
      secret_env = ["VITE_MMM_API_KEY"]
    }
    step {
      id   = "Push"
      name = "gcr.io/cloud-builders/docker"
      args = ["push", local.image]
    }
    step {
      id         = "Deploy"
      entrypoint = "gcloud"
      name       = "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
      args       = local.update_args
    }
    available_secrets {
      secret_manager {
        version_name = "projects/${var.project_id}/secrets/mmm-fe-api-key/versions/latest"
        env          = "VITE_MMM_API_KEY"
      }
    }
    options {
      logging             = "CLOUD_LOGGING_ONLY"
      substitution_option = "ALLOW_LOOSE"
    }
  }
}
