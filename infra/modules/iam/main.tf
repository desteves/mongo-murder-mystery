variable "project_id" { type = string }
variable "project_number" { type = string }
variable "region" { type = string }

locals {
  # Default compute service account: the identity Cloud Build triggers run as (it deploys the services).
  deployer = "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com"

  service_accounts = toset(["fe", "be", "mcp"])

  # Cloud Run writes container stdout to Cloud Logging itself; these cover app-level metric/log clients.
  runtime_roles = {
    be  = ["roles/logging.logWriter", "roles/monitoring.metricWriter"]
    mcp = ["roles/logging.logWriter", "roles/monitoring.metricWriter"]
  }
}

resource "google_service_account" "runtime" {
  for_each     = local.service_accounts
  project      = var.project_id
  account_id   = "mmm-${each.value}-sa"
  display_name = "MMM ${each.value} runtime (least privilege)"
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = {
    for pair in flatten([
      for sa, roles in local.runtime_roles : [for r in roles : { key = "${sa}-${r}", sa = sa, role = r }]
    ]) : pair.key => pair
  }
  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.runtime[each.value.sa].email}"
}

# The deployer must be allowed to deploy revisions that run as these accounts.
resource "google_service_account_iam_member" "deployer_acts_as" {
  for_each           = google_service_account.runtime
  service_account_id = each.value.name
  role               = "roles/iam.serviceAccountUser"
  member             = local.deployer
}

output "emails" { value = { for k, v in google_service_account.runtime : k => v.email } }
output "deployer" { value = local.deployer }
