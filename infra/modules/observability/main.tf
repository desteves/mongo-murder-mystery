variable "project_id" { type = string }
variable "notification_email" { type = string }
variable "domain" { type = string }
variable "backend_host" { type = string } # e.g. mmm-be-<number>.us-central1.run.app

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "MMM alerts (email)"
  type         = "email"
  labels       = { email_address = var.notification_email }
}

resource "google_monitoring_uptime_check_config" "frontend" {
  project      = var.project_id
  display_name = "MMM frontend /healthz"
  period       = "300s"
  timeout      = "60s"

  http_check {
    path         = "/healthz"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }
  monitored_resource {
    type   = "uptime_url"
    labels = { project_id = var.project_id, host = var.domain }
  }
}

resource "google_monitoring_uptime_check_config" "backend" {
  project      = var.project_id
  display_name = "MMM backend /health"
  period       = "300s"
  timeout      = "60s"

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }
  monitored_resource {
    type   = "uptime_url"
    labels = { project_id = var.project_id, host = var.backend_host }
  }
}

locals {
  uptime = {
    frontend = { name = "MMM frontend down (uptime check failing)", cond = "healthz failing from >1 location", id = google_monitoring_uptime_check_config.frontend.uptime_check_id }
    backend  = { name = "MMM backend down (uptime check failing)", cond = "/health failing from >1 location", id = google_monitoring_uptime_check_config.backend.uptime_check_id }
  }
}

resource "google_monitoring_alert_policy" "uptime" {
  for_each              = local.uptime
  project               = var.project_id
  display_name          = each.value.name
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.name]

  conditions {
    display_name = each.value.cond
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${each.value.id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "60s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.*"]
      }
    }
  }
}

resource "google_monitoring_alert_policy" "errors_5xx" {
  project               = var.project_id
  display_name          = "MMM Cloud Run 5xx errors"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.name]

  conditions {
    display_name = ">5 server errors in 5 min (fe, be, mcp)"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND metric.label.response_code_class=\"5xx\" AND resource.label.service_name=one_of(\"mongo-murder-mystery-fe\",\"mmm-be\",\"mmm-mcp\")"
      comparison      = "COMPARISON_GT"
      threshold_value = 5
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }
}

resource "google_monitoring_alert_policy" "crash" {
  project               = var.project_id
  display_name          = "MMM container crash or failed startup"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.name]

  alert_strategy {
    notification_rate_limit { period = "3600s" }
  }

  conditions {
    display_name = "exit(1) or startup probe failed"
    condition_matched_log {
      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=(\"mongo-murder-mystery-fe\" OR \"mmm-be\" OR \"mmm-mcp\") AND (textPayload:\"Container called exit(1)\" OR textPayload:\"STARTUP TCP probe failed\" OR textPayload:\"STARTUP HTTP probe failed\" OR textPayload:\"failed to start and listen\")"
    }
  }
}
