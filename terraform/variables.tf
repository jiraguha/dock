variable "scw_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
}

variable "scw_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
}

variable "scw_project_id" {
  description = "Scaleway project ID"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "region" {
  description = "Scaleway region"
  type        = string
  default     = "fr-par"
}

variable "zone" {
  description = "Scaleway zone"
  type        = string
  default     = "fr-par-1"
}

variable "instance_type" {
  description = "Instance type"
  type        = string
  default     = "DEV1-M"
}

variable "instance_image" {
  description = "Instance image (auto-detected for GPU instances if not set)"
  type        = string
  default     = ""
}

variable "instance_name" {
  description = "Name for the instance"
  type        = string
  default     = "dock-env"
}

variable "kubernetes_engine" {
  description = "Kubernetes engine: k3s or kind"
  type        = string
  default     = "k3s"

  validation {
    condition     = contains(["k3s", "kind"], var.kubernetes_engine)
    error_message = "kubernetes_engine must be 'k3s' or 'kind'"
  }
}

variable "use_reserved_ip" {
  description = "Whether to use a flexible IP"
  type        = bool
  default     = false
}

variable "ssh_max_startups" {
  description = "SSH MaxStartups setting (start:rate:full)"
  type        = string
  default     = "100:30:200"
}

variable "ssh_max_sessions" {
  description = "SSH MaxSessions setting"
  type        = number
  default     = 100
}

variable "snapshot_image_id" {
  description = "Image ID from snapshot to boot from (skips normal image selection)"
  type        = string
  default     = ""
}

variable "skip_provisioning" {
  description = "Skip cloud-init provisioning (for snapshot boots)"
  type        = bool
  default     = false
}
