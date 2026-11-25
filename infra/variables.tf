variable "project_id" {
  type    = string
  default = "diana-438818"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "project_number" {
  type        = string
  default     = "1020079043644"
  description = "Used for the default compute service account (the Cloud Build deployer) and Cloud Run URLs."
}

variable "github_owner" {
  type    = string
  default = "desteves"
}

variable "github_repo" {
  type    = string
  default = "mongo-murder-mystery"
}

variable "domain" {
  type    = string
  default = "mongomurdermystery.com"
}

variable "notification_email" {
  type        = string
  description = "Receives alert emails."
}

variable "agent_model" {
  type        = string
  default     = "nvidia/nemotron-3-ultra-550b-a55b:free"
  description = "OPENAI_MODEL for the OpenRouter provider (ignored when GROVE_API_KEY is set)."
}

variable "grove_model" {
  type        = string
  default     = "gpt-6-luna"
  description = "GROVE_MODEL for the Grove Foundry Gateway (used when enable_grove is true)."
}

variable "enable_grove" {
  type        = bool
  default     = false
  description = "Mount the mmm-be-grove-api-key secret as GROVE_API_KEY on the backend (create its first version first)."
}
