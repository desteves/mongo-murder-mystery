output "service_accounts" { value = module.iam.emails }
output "cloud_run_services" { value = module.runtime.service_names }
output "frontend_lb_ip" {
  value       = module.network.frontend_lb_ip
  description = "Point the Cloudflare DNS record for the domain here (proxied)."
}
