output "instance_id" {
  description = "The ID of the instance"
  value       = scaleway_instance_server.rdev.id
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
  value       = "ssh -i ${var.ssh_private_key_path} root@${local.public_ip}"
}

output "docker_host" {
  description = "DOCKER_HOST for remote Docker"
  value       = "ssh://root@${local.public_ip}"
}

output "instance_state" {
  description = "Current instance state"
  value       = scaleway_instance_server.rdev.state
}

output "kubernetes_engine" {
  description = "Kubernetes engine in use"
  value       = var.kubernetes_engine
}

output "zone" {
  description = "Scaleway zone"
  value       = var.zone
}
