# Scaleway Marketplace Images

Available images for `SCW_INSTANCE_IMAGE` configuration.

## Distributions

| Label | Name | Description |
|-------|------|-------------|
| `ubuntu_noble` | Ubuntu 24.04 Noble Numbat | Ubuntu Server for scale-out computing |
| `ubuntu_jammy` | Ubuntu 22.04 Jammy Jellyfish | Ubuntu Server for scale-out computing |
| `ubuntu_focal` | Ubuntu 20.04 Focal Fossa | Ubuntu Server for scale-out computing |
| `debian_trixie` | Debian 13 (Trixie) | Free operating system by the Debian community |
| `debian_bookworm` | Debian 12 (Bookworm) | Free operating system by the Debian community |
| `debian_bullseye` | Debian 11 (Bullseye) | Free operating system by the Debian community |
| `almalinux_10` | AlmaLinux 10 | Enterprise Linux, long-term stability |
| `almalinux_9` | AlmaLinux 9 | Enterprise Linux, long-term stability |
| `almalinux_8` | AlmaLinux 8 | Enterprise Linux, long-term stability |
| `rockylinux_10` | Rocky Linux 10 | Enterprise-grade, production-ready Linux |
| `rockylinux_9` | Rocky Linux 9 | Enterprise-grade, production-ready Linux |
| `rockylinux_8` | Rocky Linux 8 | Enterprise-grade, production-ready Linux |
| `centos_stream_9` | Centos Stream 9 | Community-driven open source ecosystem |
| `fedora_43` | Fedora 43 | Flexible OS with latest datacenter technologies |
| `fedora_42` | Fedora 42 | Flexible OS with latest datacenter technologies |

## Windows

| Label | Name | Description |
|-------|------|-------------|
| `windows_server_2022` | Windows Server 2022 | Microsoft Windows Server 2022 Base (English) |
| `windows_server_2022_core` | Windows Server 2022 Core | Microsoft Windows Server 2022 Core (English) |

## GPU / Machine Learning

| Label | Name | Description |
|-------|------|-------------|
| `ubuntu_noble_gpu_os_13_nvidia` | Ubuntu Noble GPU OS 13 (Nvidia) | Ubuntu 24.04 for Nvidia GPU and ML |
| `ubuntu_noble_gpu_os_12` | Ubuntu Noble GPU OS 12 | Ubuntu 24.04 for Nvidia GPU and ML |
| `ubuntu_jammy_gpu_os_12` | Ubuntu Jammy GPU OS 12 | Ubuntu 22.04 for Nvidia GPU and ML |

## InstantApps

| Label | Name | Description |
|-------|------|-------------|
| `docker` | Docker | Platform for building and running distributed applications |
| `gitlab` | GitLab | Web-based Git repository manager with wiki and issue tracking |
| `nextcloud` | NextCloud | Self-hosted file share and communication platform |
| `openvpn` | OpenVPN | Secure and anonymous web surfing |
| `wordpress` | WordPress | Popular web software for websites and blogs |

## Kapsule (Kubernetes)

| Label | Name | Description |
|-------|------|-------------|
| `kapsule_noble` | Kapsule Noble | Image for Kapsule nodes (Ubuntu 24.04) |
| `kapsule_jammy` | Kapsule Jammy | Image for Kapsule nodes (Ubuntu 22.04) |
| `kapsule` | Kapsule | Image for Kapsule nodes |

---

## Usage

Set the image in your dock configuration:

```bash
# Use Ubuntu 24.04 (recommended)
dock env --set SCW_INSTANCE_IMAGE=ubuntu_noble

# Use Debian 12
dock env --set SCW_INSTANCE_IMAGE=debian_bookworm

# Use GPU image for ML workloads
dock env --set SCW_INSTANCE_IMAGE=ubuntu_noble_gpu_os_13_nvidia
```

**Default:** `ubuntu_jammy` (Ubuntu 22.04)

---

*Last updated: 2026-02-12*
*Source: Scaleway Marketplace API*
