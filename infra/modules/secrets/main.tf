variable "project_id" { type = string }
variable "backend_sa_email" { type = string }
variable "mcp_sa_email" { type = string }
variable "deployer" { type = string }

# Secret *values* are never in Terraform or its state: add versions out of band
#   printf '%s' "$VALUE" | gcloud secrets versions add <name> --data-file=-
locals {
  backend_secrets = [
    "mmm-be-mongodb-uri",
    "mmm-be-salt",
    "mmm-be-clue-crime",
    "mmm-be-clue-witness1",
    "mmm-be-clue-witness2",
    "mmm-be-clue-suspect",
    "mmm-be-openai-api-key",
    "mmm-be-mdb-mcp-connection-string",
    "mmm-be-internal-api-key",
    "mmm-be-grove-api-key", # optional: Grove Foundry Gateway key (see enable_grove)
  ]
  mcp_secrets = ["mmm-mcp-mdb-mcp-connection-string"]
  # Build-time secret for the frontend image (VITE_MMM_API_KEY). Public by design: it ships in the bundle.
  build_secrets = ["mmm-fe-api-key"]
}

resource "google_secret_manager_secret" "this" {
  for_each  = toset(concat(local.backend_secrets, local.mcp_secrets, local.build_secrets))
  project   = var.project_id
  secret_id = each.value
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "backend" {
  for_each  = toset(local.backend_secrets)
  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.backend_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "mcp" {
  for_each  = toset(local.mcp_secrets)
  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.mcp_sa_email}"
}

resource "google_secret_manager_secret_iam_member" "build" {
  for_each  = toset(local.build_secrets)
  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.value].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.deployer
}

output "ids" { value = { for k, v in google_secret_manager_secret.this : k => v.secret_id } }
