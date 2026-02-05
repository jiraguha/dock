# SSH Key
resource "digitalocean_ssh_key" "rdev" {
  name       = "${var.droplet_name}-key"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# Cloud-init user data
locals {
  cloud_init = templatefile("${path.module}/cloud-init/user-data.yaml.tftpl", {
    kubernetes_engine = var.kubernetes_engine
  })
}

# Droplet
resource "digitalocean_droplet" "rdev" {
  name     = var.droplet_name
  region   = var.region
  size     = var.droplet_size
  image    = "ubuntu-24-04-x64"
  ssh_keys = [digitalocean_ssh_key.rdev.fingerprint]

  user_data = local.cloud_init

  graceful_shutdown = true

  tags = ["rdev", "disposable"]

  lifecycle {
    create_before_destroy = false
  }
}

# Optional Reserved IP
resource "digitalocean_reserved_ip" "rdev" {
  count  = var.use_reserved_ip ? 1 : 0
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "rdev" {
  count      = var.use_reserved_ip ? 1 : 0
  ip_address = digitalocean_reserved_ip.rdev[0].ip_address
  droplet_id = digitalocean_droplet.rdev.id
}
