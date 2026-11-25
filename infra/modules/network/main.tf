variable "project_id" { type = string }
variable "region" { type = string }
variable "service_names" { type = map(string) } # frontend / backend Cloud Run service names for the NEGs

# Serverless VPC connector used by the backend and MCP to reach Atlas over private ranges.
resource "google_vpc_access_connector" "main" {
  project       = var.project_id
  region        = var.region
  name          = "mmm-fe-vpc-connector"
  network       = "default"
  ip_cidr_range = "10.89.18.0/28"
  min_instances = 2
  max_instances = 10
  machine_type  = "e2-micro"
}

# ---------------------------------------------------------------- regional load balancers
# External HTTPS LB (Cloudflare -> LB -> frontend) and an internal LB in front of the API.
data "google_compute_region_ssl_certificate" "origin" {
  # Self-managed Cloudflare origin certificate. Its private key is not recoverable, so it is only referenced here.
  project = var.project_id
  region  = var.region
  name    = "cf-mmm-cert"
}

resource "google_compute_region_network_endpoint_group" "frontend" {
  project               = var.project_id
  region                = var.region
  name                  = "mmm-neg"
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.service_names["frontend"]
  }
}

resource "google_compute_region_network_endpoint_group" "api" {
  project               = var.project_id
  region                = var.region
  name                  = "mmm-api-neg"
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.service_names["backend"]
  }
}

resource "google_compute_region_security_policy" "frontend" {
  project = var.project_id
  region  = var.region
  name    = "default-security-policy-for-backend-service-mmm-lb-svc"
  type    = "CLOUD_ARMOR"

  # Google generated this policy (default rule included); rules are managed in the console for now.
  lifecycle {
    ignore_changes = all
  }
}

# NOTE: this backend service is attached to the Cloud Armor policy above in GCP, but google_compute_region_backend_service
# has no argument for that attachment (provider 6.x), so it is not declared here. Terraform leaves the existing
# attachment alone as long as this resource shows no diff; if you ever change it, re-check the Armor attachment.
resource "google_compute_region_backend_service" "frontend" {
  project                         = var.project_id
  region                          = var.region
  name                            = "mmm-lb-svc"
  protocol                        = "HTTPS"
  load_balancing_scheme           = "EXTERNAL_MANAGED"
  timeout_sec                     = 30
  connection_draining_timeout_sec = 0

  backend {
    group           = google_compute_region_network_endpoint_group.frontend.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
}

resource "google_compute_region_backend_service" "api" {
  project                         = var.project_id
  region                          = var.region
  name                            = "mmm-api-svc"
  protocol                        = "HTTPS"
  load_balancing_scheme           = "INTERNAL_MANAGED"
  timeout_sec                     = 30
  connection_draining_timeout_sec = 0

  backend {
    group           = google_compute_region_network_endpoint_group.api.id
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }
}

resource "google_compute_region_url_map" "frontend" {
  project         = var.project_id
  region          = var.region
  name            = "mmm-lb"
  default_service = google_compute_region_backend_service.frontend.id
}

resource "google_compute_region_url_map" "api" {
  project         = var.project_id
  region          = var.region
  name            = "mmm-api-lb"
  default_service = google_compute_region_backend_service.api.id
}

resource "google_compute_region_target_http_proxy" "frontend" {
  project = var.project_id
  region  = var.region
  name    = "mmm-lb-target-proxy"
  url_map = google_compute_region_url_map.frontend.id
  # Changing this forces a replacement (and a brief port-80 outage), so it must match what exists.
  http_keep_alive_timeout_sec = 300
}

resource "google_compute_region_target_https_proxy" "frontend" {
  project          = var.project_id
  region           = var.region
  name             = "mmm-lb-target-proxy-2"
  url_map          = google_compute_region_url_map.frontend.id
  ssl_certificates = [data.google_compute_region_ssl_certificate.origin.id]
}

resource "google_compute_region_target_http_proxy" "api" {
  project = var.project_id
  region  = var.region
  name    = "mmm-api-lb-target-proxy"
  url_map = google_compute_region_url_map.api.id
}

resource "google_compute_address" "frontend_http" {
  project      = var.project_id
  region       = var.region
  name         = "mmm-ip"
  address_type = "EXTERNAL"
  network_tier = "STANDARD"
}

resource "google_compute_address" "frontend_https" {
  project      = var.project_id
  region       = var.region
  name         = "mmm-lb-ip-https"
  address_type = "EXTERNAL"
  network_tier = "PREMIUM"
}

resource "google_compute_address" "api_internal" {
  project      = var.project_id
  region       = var.region
  name         = "mmm-api-ip"
  address_type = "INTERNAL"
  subnetwork   = "default"
  address      = "10.128.0.52"
  purpose      = "GCE_ENDPOINT"
}

resource "google_compute_forwarding_rule" "frontend_http" {
  project               = var.project_id
  region                = var.region
  name                  = "mmm-lb-forwarding-rule"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  network_tier          = "STANDARD"
  network               = "default"
  ip_address            = google_compute_address.frontend_http.id
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.frontend.id
}

resource "google_compute_forwarding_rule" "frontend_https" {
  project               = var.project_id
  region                = var.region
  name                  = "mmm-lb-forwarding-rule-2"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  network_tier          = "PREMIUM"
  network               = "default"
  ip_address            = google_compute_address.frontend_https.id
  port_range            = "443"
  target                = google_compute_region_target_https_proxy.frontend.id
}

resource "google_compute_forwarding_rule" "api_internal" {
  project               = var.project_id
  region                = var.region
  name                  = "mmm-api-lb-forwarding-rule"
  load_balancing_scheme = "INTERNAL_MANAGED"
  network_tier          = "PREMIUM"
  network               = "default"
  subnetwork            = "default"
  ip_address            = google_compute_address.api_internal.id
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.api.id
}

output "vpc_connector_id" { value = google_vpc_access_connector.main.id }
output "frontend_lb_ip" { value = google_compute_address.frontend_https.address }
