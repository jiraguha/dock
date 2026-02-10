// Embedded terraform files - synced to ~/.dock/terraform on startup
// This ensures the binary always has the correct terraform configuration

export const TERRAFORM_FILES: Record<string, string> = {
  "variables.tf": `variable "scw_access_key" {
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
`,

  "main.tf": `# SSH Key
resource "scaleway_iam_ssh_key" "dock" {
  name       = "\${var.instance_name}-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# Cloud-init user data
locals {
  cloud_init = templatefile("\${path.module}/cloud-init/user-data.yaml.tftpl", {
    kubernetes_engine = var.kubernetes_engine
    ssh_max_startups  = var.ssh_max_startups
    ssh_max_sessions  = var.ssh_max_sessions
  })

  # Detect if this is a GPU instance (L4, L40S, H100, GPU-, RENDER-)
  is_gpu_instance = can(regex("^(GPU-|RENDER-|L4-|L40S-|H100-)", var.instance_type))

  # Auto-select image: GPU instances need gpu-os-12, others use ubuntu_jammy
  default_image = var.instance_image != "" ? var.instance_image : (local.is_gpu_instance ? "gpu-os-12" : "ubuntu_jammy")

  # Use snapshot image if provided, otherwise use default image
  instance_image = var.snapshot_image_id != "" ? var.snapshot_image_id : local.default_image

  # Skip cloud-init when booting from snapshot
  use_cloud_init = !var.skip_provisioning
}

# Security Group
resource "scaleway_instance_security_group" "dock" {
  name                    = "\${var.instance_name}-sg"
  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"

  # SSH
  inbound_rule {
    action   = "accept"
    port     = 22
    protocol = "TCP"
  }

  # Kubernetes API (k3s default port)
  inbound_rule {
    action   = "accept"
    port     = 6443
    protocol = "TCP"
  }

  # ICMP (ping)
  inbound_rule {
    action   = "accept"
    protocol = "ICMP"
  }
}

# Instance
resource "scaleway_instance_server" "dock" {
  name  = var.instance_name
  type  = var.instance_type
  image = local.instance_image

  tags = ["dock", "disposable"]

  security_group_id = scaleway_instance_security_group.dock.id

  # Enable public IP
  ip_id = var.use_reserved_ip ? scaleway_instance_ip.dock[0].id : scaleway_instance_ip.dynamic[0].id

  # Only include cloud-init when not booting from snapshot
  user_data = local.use_cloud_init ? {
    cloud-init = local.cloud_init
  } : {}

  root_volume {
    size_in_gb            = 40
    delete_on_termination = true
  }
}

# Dynamic IP (always created unless using reserved IP)
resource "scaleway_instance_ip" "dynamic" {
  count = var.use_reserved_ip ? 0 : 1
}

# Optional Flexible IP
resource "scaleway_instance_ip" "dock" {
  count = var.use_reserved_ip ? 1 : 0
}

# Compute the public IP
locals {
  public_ip = var.use_reserved_ip ? scaleway_instance_ip.dock[0].address : scaleway_instance_ip.dynamic[0].address
}
`,

  "outputs.tf": `output "instance_id" {
  description = "The ID of the instance"
  value       = scaleway_instance_server.dock.id
}

output "public_ip" {
  description = "Public IP address"
  value       = local.public_ip
}

output "ssh_user" {
  description = "SSH username"
  value       = "root"
}

output "ssh_key_path" {
  description = "Path to SSH private key"
  value       = var.ssh_private_key_path
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i \${var.ssh_private_key_path} root@\${local.public_ip}"
}

output "docker_host" {
  description = "DOCKER_HOST for remote Docker"
  value       = "ssh://root@\${local.public_ip}"
}

output "instance_state" {
  description = "Current instance state"
  value       = scaleway_instance_server.dock.state
}

output "kubernetes_engine" {
  description = "Kubernetes engine in use"
  value       = var.kubernetes_engine
}

output "zone" {
  description = "Scaleway zone"
  value       = var.zone
}
`,

  "providers.tf": `provider "scaleway" {
  access_key = var.scw_access_key
  secret_key = var.scw_secret_key
  project_id = var.scw_project_id
  zone       = var.zone
  region     = var.region
}
`,

  "versions.tf": `terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.68"
    }
  }
}
`,

  "cloud-init/user-data.yaml.tftpl": `#cloud-config

package_update: true
package_upgrade: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release
  - jq
  - htop

write_files:
  - path: /etc/dock/metadata.json
    content: |
      {
        "kubernetes_engine": "\${kubernetes_engine}",
        "provisioned_at": "WILL_BE_SET_AT_RUNTIME"
      }
    permissions: '0644'

  - path: /usr/local/bin/provision-complete
    content: |
      #!/bin/bash
      # Update metadata with actual timestamp
      jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.provisioned_at = $ts' /etc/dock/metadata.json > /tmp/metadata.json
      mv /tmp/metadata.json /etc/dock/metadata.json
      touch /var/run/dock-provisioned
      echo "Provisioning complete at $(date)" >> /var/log/dock-provision.log
    permissions: '0755'

runcmd:
  # Create metadata directory
  - mkdir -p /etc/dock

  # Increase SSH connection limits for Docker over SSH + port forwarding
  # High limits needed for tools like supabase that spawn many containers simultaneously
  - sed -i 's/#MaxStartups.*/MaxStartups \${ssh_max_startups}/' /etc/ssh/sshd_config
  - sed -i 's/MaxStartups.*/MaxStartups \${ssh_max_startups}/' /etc/ssh/sshd_config
  - sed -i 's/#MaxSessions.*/MaxSessions \${ssh_max_sessions}/' /etc/ssh/sshd_config
  - sed -i 's/MaxSessions.*/MaxSessions \${ssh_max_sessions}/' /etc/ssh/sshd_config
  - systemctl restart sshd

  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker root

%{ if kubernetes_engine == "k3s" ~}
  # Install k3s
  - curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
  - mkdir -p /root/.kube
  - cp /etc/rancher/k3s/k3s.yaml /root/.kube/config
  - chmod 600 /root/.kube/config
%{ endif ~}
%{ if kubernetes_engine == "kind" ~}
  # Install kind
  - curl -Lo /usr/local/bin/kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
  - chmod +x /usr/local/bin/kind
  # Install kubectl
  - curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  - install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  - rm kubectl
  # Create kind cluster
  - kind create cluster --name dock --wait 5m
  - mkdir -p /root/.kube
  - kind get kubeconfig --name dock > /root/.kube/config
  - chmod 600 /root/.kube/config
%{ endif ~}

  # Mark provisioning complete
  - /usr/local/bin/provision-complete

final_message: "dock environment ready after $UPTIME seconds"
`,
};
