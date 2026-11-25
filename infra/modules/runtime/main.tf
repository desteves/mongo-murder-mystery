variable "project_id" { type = string }
variable "project_number" { type = string }
variable "region" { type = string }
variable "domain" { type = string }
variable "agent_model" { type = string }
variable "enable_grove" { type = bool }
variable "grove_model" { type = string }
variable "sa_emails" { type = map(string) }
variable "vpc_connector_id" { type = string }

locals {
  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/mongo-murder-mystery"
  # Cloud Run's stable URL form (project-number based).
  be_url  = "https://mmm-be-${var.project_number}.${var.region}.run.app"
  mcp_url = "https://mmm-mcp-${var.project_number}.${var.region}.run.app/mcp"

  backend_secret_env = merge(
    {
      MONGODB_URI               = "mmm-be-mongodb-uri"
      SALT                      = "mmm-be-salt"
      CLUE_CRIME                = "mmm-be-clue-crime"
      CLUE_WITNESS1             = "mmm-be-clue-witness1"
      CLUE_WITNESS2             = "mmm-be-clue-witness2"
      CLUE_SUSPECT              = "mmm-be-clue-suspect"
      OPENAI_API_KEY            = "mmm-be-openai-api-key"
      MDB_MCP_CONNECTION_STRING = "mmm-be-mdb-mcp-connection-string"
      INTERNAL_API_KEY          = "mmm-be-internal-api-key"
    },
    var.enable_grove ? { GROVE_API_KEY = "mmm-be-grove-api-key" } : {}
  )
}

# Cloud Build owns the image and the revision labels after the first apply (its trigger runs
# `gcloud run services update --image ... --labels ...`), so Terraform must not fight it.
# ---------------------------------------------------------------- frontend (nginx)
resource "google_cloud_run_v2_service" "frontend" {
  project  = var.project_id
  name     = "mongo-murder-mystery-fe"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" # reached only through the load balancer

  scaling {
    min_instance_count = 1 # service-level minimum (also set on the revision template below)
  }

  template {
    service_account                  = var.sa_emails["fe"]
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = "default"
        subnetwork = "default"
      }
    }

    containers {
      name  = "placeholder-1"
      image = "${local.image_base}/mongo-murder-mystery-fe:bootstrap"
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1000m", memory = "512Mi" }
        cpu_idle          = true # CPU only while handling requests (the Cloud Run default)
        startup_cpu_boost = true
      }
      startup_probe {
        http_get { path = "/healthz" }
        period_seconds    = 3
        timeout_seconds   = 2
        failure_threshold = 10
      }
      env {
        name  = "MMM_API_BASE_URL"
        value = local.be_url
      }
      env {
        name  = "VITE_MMM_API_BASE_URL"
        value = local.be_url
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      template[0].labels,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------- backend (Express API)
resource "google_cloud_run_v2_service" "backend" {
  project  = var.project_id
  name     = "mmm-be"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = var.sa_emails["be"]
    timeout                          = "300s"
    max_instance_request_concurrency = 30 # Mongo pool is 10 per instance

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      name  = "mmm-be"
      image = "${local.image_base}/mmm-be:bootstrap"
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1000m", memory = "512Mi" }
        cpu_idle          = true # CPU only while handling requests (the Cloud Run default)
        startup_cpu_boost = true
      }
      startup_probe {
        http_get { path = "/health" }
        period_seconds    = 5
        timeout_seconds   = 3
        failure_threshold = 12
      }

      env {
        name  = "ALLOWED_ORIGIN"
        value = "https://${var.domain}"
      }
      env {
        name  = "MCP_SERVER_URL"
        value = local.mcp_url
      }
      env {
        name  = "OPENAI_MODEL"
        value = var.agent_model
      }
      env {
        name  = "REQUEST_TIMEOUT_MS"
        value = "60000" # Grove gpt-6-luna runs with reasoning off, so answers are quick
      }

      dynamic "env" {
        for_each = var.enable_grove ? { GROVE_MODEL = var.grove_model } : {}
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.backend_secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      template[0].labels,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------- MongoDB MCP server (private)
resource "google_cloud_run_v2_service" "mcp" {
  project  = var.project_id
  name     = "mmm-mcp"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # protected by IAM (invoker), not by network

  scaling {
    min_instance_count = 1 # service-level minimum, as deployed
  }

  template {
    service_account                  = var.sa_emails["mcp"]
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    scaling {
      max_instance_count = 1 # MCP sessions live in memory: one instance only
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      name  = "placeholder-1"
      image = "${local.image_base}/mmm-mcp:bootstrap"
      ports { container_port = 8080 }
      resources {
        limits            = { cpu = "1000m", memory = "512Mi" }
        cpu_idle          = true # CPU only while handling requests (the Cloud Run default)
        startup_cpu_boost = true
      }
      env {
        name  = "MDB_MCP_READ_ONLY"
        value = "true"
      }
      env {
        name = "MDB_MCP_CONNECTION_STRING"
        value_source {
          secret_key_ref {
            secret  = "mmm-mcp-mdb-mcp-connection-string"
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].revision,
      template[0].labels,
      client,
      client_version,
    ]
  }
}

# ---------------------------------------------------------------- who may invoke
# The site and API are public by design (a game). MCP is not: only the backend's identity may call it.
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "mcp_backend_only" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.mcp.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.sa_emails["be"]}"
}

output "service_names" {
  value = {
    frontend = google_cloud_run_v2_service.frontend.name
    backend  = google_cloud_run_v2_service.backend.name
    mcp      = google_cloud_run_v2_service.mcp.name
  }
}
