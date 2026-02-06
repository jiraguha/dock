# SSH Key
resource "scaleway_iam_ssh_key" "dock" {
  name       = "${var.instance_name}-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# Cloud-init user data
locals {
  cloud_init = templatefile("${path.module}/cloud-init/user-data.yaml.tftpl", {
    kubernetes_engine = var.kubernetes_engine
  })
}

# Security Group
resource "scaleway_instance_security_group" "dock" {
  name                    = "${var.instance_name}-sg"
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
  image = "ubuntu_jammy"

  tags = ["dock", "disposable"]

  security_group_id = scaleway_instance_security_group.dock.id

  # Enable public IP
  ip_id = var.use_reserved_ip ? scaleway_instance_ip.dock[0].id : scaleway_instance_ip.dynamic[0].id

  user_data = {
    cloud-init = local.cloud_init
  }

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
