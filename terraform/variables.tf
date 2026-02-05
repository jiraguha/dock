variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
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
  description = "DigitalOcean region"
  type        = string
  default     = "nyc1"
}

variable "droplet_size" {
  description = "Droplet size slug"
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "droplet_name" {
  description = "Name for the droplet"
  type        = string
  default     = "rdev-env"
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
  description = "Whether to use a reserved IP"
  type        = bool
  default     = false
}
