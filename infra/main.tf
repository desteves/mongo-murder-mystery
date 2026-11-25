# Mongo Murder Mystery on GCP: three Cloud Run services (nginx frontend, Express API, MongoDB MCP server), Secret
# Manager, least-privilege service accounts, regional load balancers, Cloud Build triggers and monitoring.
# Everything here already existed when this was written: imports.tf adopts it, so `terraform plan` should show
# no destructive change. Not managed here (see README): Atlas, Cloudflare, the Artifact Registry repo, secret values.

module "apis" {
  source     = "./modules/apis"
  project_id = var.project_id
}

module "iam" {
  source         = "./modules/iam"
  project_id     = var.project_id
  project_number = var.project_number
  region         = var.region
  depends_on     = [module.apis]
}

module "secrets" {
  source           = "./modules/secrets"
  project_id       = var.project_id
  backend_sa_email = module.iam.emails["be"]
  mcp_sa_email     = module.iam.emails["mcp"]
  deployer         = module.iam.deployer
  depends_on       = [module.apis]
}

module "network" {
  source        = "./modules/network"
  project_id    = var.project_id
  region        = var.region
  service_names = module.runtime.service_names
  depends_on    = [module.apis]
}

module "runtime" {
  source           = "./modules/runtime"
  project_id       = var.project_id
  project_number   = var.project_number
  region           = var.region
  domain           = var.domain
  agent_model      = var.agent_model
  enable_grove     = var.enable_grove
  grove_model      = var.grove_model
  sa_emails        = module.iam.emails
  vpc_connector_id = "projects/${var.project_id}/locations/${var.region}/connectors/mmm-fe-vpc-connector"
  depends_on       = [module.secrets]
}

module "cicd" {
  source         = "./modules/cicd"
  project_id     = var.project_id
  project_number = var.project_number
  region         = var.region
  github_owner   = var.github_owner
  github_repo    = var.github_repo
  depends_on     = [module.apis]
}

module "observability" {
  source             = "./modules/observability"
  project_id         = var.project_id
  notification_email = var.notification_email
  domain             = var.domain
  backend_host       = "mmm-be-${var.project_number}.${var.region}.run.app"
  depends_on         = [module.apis]
}
