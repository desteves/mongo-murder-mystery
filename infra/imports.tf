# Adopt the resources that already exist (Terraform >= 1.7). After the first successful apply these blocks are
# harmless and can be deleted.
locals {
  p = var.project_id
  r = var.region
}

# --- APIs
import {
  for_each = toset(["run", "cloudbuild", "secretmanager", "artifactregistry", "compute", "vpcaccess", "monitoring", "logging", "iam"])
  to       = module.apis.google_project_service.this["${each.value}.googleapis.com"]
  id       = "${local.p}/${each.value}.googleapis.com"
}

# --- service accounts
import {
  for_each = toset(["fe", "be", "mcp"])
  to       = module.iam.google_service_account.runtime[each.value]
  id       = "projects/${local.p}/serviceAccounts/mmm-${each.value}-sa@${local.p}.iam.gserviceaccount.com"
}

# --- secrets (mmm-be-grove-api-key is new and gets created)
import {
  for_each = toset([
    "mmm-be-mongodb-uri", "mmm-be-salt", "mmm-be-clue-crime", "mmm-be-clue-witness1", "mmm-be-clue-witness2",
    "mmm-be-clue-suspect", "mmm-be-openai-api-key", "mmm-be-mdb-mcp-connection-string", "mmm-be-internal-api-key",
    "mmm-mcp-mdb-mcp-connection-string", "mmm-fe-api-key",
  ])
  to = module.secrets.google_secret_manager_secret.this[each.value]
  id = "projects/${local.p}/secrets/${each.value}"
}

# --- Cloud Run
import {
  to = module.runtime.google_cloud_run_v2_service.frontend
  id = "projects/${local.p}/locations/${local.r}/services/mongo-murder-mystery-fe"
}
import {
  to = module.runtime.google_cloud_run_v2_service.backend
  id = "projects/${local.p}/locations/${local.r}/services/mmm-be"
}
import {
  to = module.runtime.google_cloud_run_v2_service.mcp
  id = "projects/${local.p}/locations/${local.r}/services/mmm-mcp"
}

# --- network
import {
  to = module.network.google_vpc_access_connector.main
  id = "projects/${local.p}/locations/${local.r}/connectors/mmm-fe-vpc-connector"
}
import {
  to = module.network.google_compute_region_network_endpoint_group.frontend
  id = "projects/${local.p}/regions/${local.r}/networkEndpointGroups/mmm-neg"
}
import {
  to = module.network.google_compute_region_network_endpoint_group.api
  id = "projects/${local.p}/regions/${local.r}/networkEndpointGroups/mmm-api-neg"
}
import {
  to = module.network.google_compute_region_security_policy.frontend
  id = "projects/${local.p}/regions/${local.r}/securityPolicies/default-security-policy-for-backend-service-mmm-lb-svc"
}
import {
  to = module.network.google_compute_region_backend_service.frontend
  id = "projects/${local.p}/regions/${local.r}/backendServices/mmm-lb-svc"
}
import {
  to = module.network.google_compute_region_backend_service.api
  id = "projects/${local.p}/regions/${local.r}/backendServices/mmm-api-svc"
}
import {
  to = module.network.google_compute_region_url_map.frontend
  id = "projects/${local.p}/regions/${local.r}/urlMaps/mmm-lb"
}
import {
  to = module.network.google_compute_region_url_map.api
  id = "projects/${local.p}/regions/${local.r}/urlMaps/mmm-api-lb"
}
import {
  to = module.network.google_compute_region_target_http_proxy.frontend
  id = "projects/${local.p}/regions/${local.r}/targetHttpProxies/mmm-lb-target-proxy"
}
import {
  to = module.network.google_compute_region_target_https_proxy.frontend
  id = "projects/${local.p}/regions/${local.r}/targetHttpsProxies/mmm-lb-target-proxy-2"
}
import {
  to = module.network.google_compute_region_target_http_proxy.api
  id = "projects/${local.p}/regions/${local.r}/targetHttpProxies/mmm-api-lb-target-proxy"
}
import {
  to = module.network.google_compute_address.frontend_http
  id = "projects/${local.p}/regions/${local.r}/addresses/mmm-ip"
}
import {
  to = module.network.google_compute_address.frontend_https
  id = "projects/${local.p}/regions/${local.r}/addresses/mmm-lb-ip-https"
}
import {
  to = module.network.google_compute_address.api_internal
  id = "projects/${local.p}/regions/${local.r}/addresses/mmm-api-ip"
}
import {
  to = module.network.google_compute_forwarding_rule.frontend_http
  id = "projects/${local.p}/regions/${local.r}/forwardingRules/mmm-lb-forwarding-rule"
}
import {
  to = module.network.google_compute_forwarding_rule.frontend_https
  id = "projects/${local.p}/regions/${local.r}/forwardingRules/mmm-lb-forwarding-rule-2"
}
import {
  to = module.network.google_compute_forwarding_rule.api_internal
  id = "projects/${local.p}/regions/${local.r}/forwardingRules/mmm-api-lb-forwarding-rule"
}

# --- Cloud Build triggers
import {
  to = module.cicd.google_cloudbuild_trigger.frontend
  id = "projects/${local.p}/locations/global/triggers/357ce857-d5eb-428c-8227-35a8d8128b20"
}
import {
  to = module.cicd.google_cloudbuild_trigger.backend
  id = "projects/${local.p}/locations/global/triggers/4e7a9e11-c44a-4dbd-a23d-7a8228bb4fe6"
}
import {
  to = module.cicd.google_cloudbuild_trigger.mcp
  id = "projects/${local.p}/locations/global/triggers/a4f79735-f682-495c-a10d-05949cba988a"
}

# --- monitoring
import {
  to = module.observability.google_monitoring_notification_channel.email
  id = "projects/${local.p}/notificationChannels/7973334499501051476"
}
import {
  to = module.observability.google_monitoring_uptime_check_config.frontend
  id = "projects/${local.p}/uptimeCheckConfigs/mmm-frontend-healthz-YEtJwj-63As"
}
import {
  to = module.observability.google_monitoring_uptime_check_config.backend
  id = "projects/${local.p}/uptimeCheckConfigs/mmm-backend-health-mA6d3t368i0"
}
import {
  to = module.observability.google_monitoring_alert_policy.uptime["frontend"]
  id = "projects/${local.p}/alertPolicies/18187330024625773375"
}
import {
  to = module.observability.google_monitoring_alert_policy.uptime["backend"]
  id = "projects/${local.p}/alertPolicies/780203382681966295"
}
import {
  to = module.observability.google_monitoring_alert_policy.errors_5xx
  id = "projects/${local.p}/alertPolicies/5743906407569861975"
}
import {
  to = module.observability.google_monitoring_alert_policy.crash
  id = "projects/${local.p}/alertPolicies/530147968169447224"
}
