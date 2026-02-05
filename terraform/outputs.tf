output "droplet_id" {
  description = "The ID of the droplet"
  value       = digitalocean_droplet.rdev.id
}

output "public_ip" {
  description = "Public IP address"
  value       = var.use_reserved_ip ? digitalocean_reserved_ip.rdev[0].ip_address : digitalocean_droplet.rdev.ipv4_address
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
  value       = "ssh -i ${var.ssh_private_key_path} root@${var.use_reserved_ip ? digitalocean_reserved_ip.rdev[0].ip_address : digitalocean_droplet.rdev.ipv4_address}"
}

output "docker_host" {
  description = "DOCKER_HOST for remote Docker"
  value       = "ssh://root@${var.use_reserved_ip ? digitalocean_reserved_ip.rdev[0].ip_address : digitalocean_droplet.rdev.ipv4_address}"
}

output "droplet_status" {
  description = "Current droplet status"
  value       = digitalocean_droplet.rdev.status
}

output "kubernetes_engine" {
  description = "Kubernetes engine in use"
  value       = var.kubernetes_engine
}
