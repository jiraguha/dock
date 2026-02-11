<div align="center">

```
       _            _
    __| | ___   ___| | __
   / _` |/ _ \ / __| |/ /
  | (_| | (_) | (__|   <
   \__,_|\___/ \___|_|\_\

```

# dock

**Disposable Remote Development Environments**

*Your laptop stays cool. Your cloud does the work.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1.svg)](https://bun.sh)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC.svg)](https://terraform.io)
[![Scaleway](https://img.shields.io/badge/cloud-Scaleway-4F0599.svg)](https://scaleway.com)

---

**Create** | **Work** | **Stop** | **Resume** | **Destroy**

Zero local resource consumption. Full control. Pay only for what you use.

</div>

---

## Why dock?

Running Docker and Kubernetes locally drains your battery, spins up fans, and turns your laptop into a space heater. **dock** moves all that to a remote VM you fully control.

| | Local Dev | dock |
|---|:---:|:---:|
| CPU usage | High | Zero |
| Battery drain | Yes | No |
| Fan noise | Loud | Silent |
| Cost when idle | N/A | $0 |
| Reproducible | Maybe | Always |

---

## Quick Start (5 minutes)

### 1. Install dock

```bash
curl -fsSL https://raw.githubusercontent.com/jiraguha/dock/main/install.sh | bash
```

### 2. Configure credentials

```bash
dock env --set SCW_ACCESS_KEY=SCWXXXXXXXXX,SCW_SECRET_KEY=xxx-xxx-xxx,SCW_PROJECT_ID=xxx-xxx-xxx
```

Or create `~/.dock/.env`:
```bash
mkdir -p ~/.dock
cat > ~/.dock/.env << 'EOF'
SCW_ACCESS_KEY=SCWXXXXXXXXXXXXXXXXX
SCW_SECRET_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SCW_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EOF
```

### 3. Create your environment

```bash
dock create
```

That's it! Auto-pilot mode handles SSH multiplexing, port forwarding, and environment setup automatically.

### 4. Start working

```bash
dock ssh                    # SSH into your environment
docker ps                   # Docker works automatically
kubectl get nodes           # Kubernetes works automatically
```

---

## Prerequisites

- [Terraform](https://terraform.io) CLI
- [Scaleway CLI](https://github.com/scaleway/scaleway-cli) (`scw`)
- Scaleway API credentials
- SSH key pair (`~/.ssh/id_ed25519` or `~/.ssh/id_rsa`)

---

## Core Commands

### Lifecycle

```bash
dock create              # Create new environment
dock start               # Power on stopped environment
dock stop                # Power off (preserves data)
dock destroy             # Delete everything (zero cost)
dock status              # Show current state
```

### Working

```bash
dock ssh                 # Open SSH shell
dock ssh "docker ps"     # Run remote command
```

### Port Forwarding

```bash
dock portforward         # Forward ports (foreground)
dock portforward -d      # Forward ports (background)
dock portforward --stop  # Stop background tunnel
```

---

## Auto-Pilot Mode

By default, dock runs in **auto-pilot mode**, which automatically handles connection setup after `dock create` and `dock start`.

### What auto-pilot does

After `dock create` or `dock start` completes:

| Action | Equivalent Manual Command |
|--------|--------------------------|
| SSH multiplexing setup | `dock ssh-config --start-master` |
| Port forwarding (background) | `dock portforward -d` |
| Docker environment | `export DOCKER_HOST=ssh://root@<ip>` |
| Kubernetes config | `export KUBECONFIG=~/.kube/dock-config` |

### Commands handled by auto-pilot

| Command | Auto-pilot actions |
|---------|-------------------|
| `dock create` | Full setup (SSH + ports + Docker + K8s) |
| `dock start` | Reconnect all services |
| `dock stop` | Clean up connections |
| `dock destroy` | Clean up connections |

### Shell integration

Run `dock init` once to add auto-pilot integration to your shell. This sources `~/.dock/dock.init` which automatically sets environment variables when dock is running.

### Disable auto-pilot

```bash
dock env --set AUTO_PILOT=false
```

When disabled, you manage connections manually:
```bash
dock create
dock ssh-config --start-master
dock portforward -d
eval $(dock docker-env)
export KUBECONFIG=~/.kube/dock-config
```

---

## Snapshots (Fast Startup)

Create snapshots of your configured environment for 10x faster startups:

```bash
# Create a snapshot from running instance
dock snapshot --create

# List available snapshots
dock snapshot --list

# Create new instance from snapshot (skips provisioning)
dock create --snapshot
```

Snapshots preserve:
- Installed packages and tools
- Docker images and containers
- Configuration files
- Everything on the disk

---

## Environment Configuration

### View current configuration

```bash
dock env
```

### Set configuration

```bash
dock env --set SCW_INSTANCE_TYPE=DEV1-L,SCW_ZONE=fr-par-2
```

### Remove configuration

```bash
dock env --unset SCW_INSTANCE_NAME
```

### Available options

| Variable | Default | Description |
|----------|---------|-------------|
| `SCW_ACCESS_KEY` | (required) | Scaleway access key |
| `SCW_SECRET_KEY` | (required) | Scaleway secret key |
| `SCW_PROJECT_ID` | (required) | Scaleway project ID |
| `SCW_REGION` | `fr-par` | Scaleway region |
| `SCW_ZONE` | `fr-par-1` | Scaleway zone |
| `SCW_INSTANCE_TYPE` | `DEV1-M` | Instance type (see below) |
| `SCW_INSTANCE_IMAGE` | (auto) | Instance image |
| `SCW_INSTANCE_NAME` | `dock-env` | Instance name |
| `SSH_PUBLIC_KEY_PATH` | `~/.ssh/id_ed25519.pub` | SSH public key |
| `SSH_PRIVATE_KEY_PATH` | `~/.ssh/id_ed25519` | SSH private key |
| `K8S_ENGINE` | `k3s` | Kubernetes: `k3s` or `kind` |
| `FORWARD_PORTS` | `8080,3000,5432,6379,27017` | Ports to forward |
| `AUTO_PILOT` | `true` | Enable auto-pilot mode |

### Instance Types

| Type | vCPU | RAM | Best for |
|------|------|-----|----------|
| `DEV1-S` | 2 | 2GB | Light development |
| `DEV1-M` | 3 | 4GB | Standard development |
| `DEV1-L` | 4 | 8GB | Heavy workloads |
| `DEV1-XL` | 4 | 12GB | Large projects |
| `L4-1-24G` | 8 | 48GB | GPU/ML workloads |

---

## Advanced Usage

### Docker

```bash
# Simple mode (SSH per command)
eval $(dock docker-env)
docker ps

# Tunnel mode (single connection, faster for heavy use)
dock docker-tunnel -d
export DOCKER_HOST=unix://~/.dock/sockets/docker.sock
docker ps
```

### Kubernetes

```bash
dock kubeconfig
export KUBECONFIG=~/.kube/dock-config
kubectl get nodes
```

### SSH Configuration

```bash
dock ssh-config             # Set up SSH multiplexing
dock ssh-config --start-master  # Start master connection
dock configure              # Apply SSH server settings
dock configure --show       # Show remote SSH config
```

### Connection Management

```bash
dock connection             # Show connection status
dock connection --refresh   # Restart all connections
dock connection --clean     # Stop all connections
```

### Analytics

```bash
dock analytics              # Show usage summary
dock analytics --last       # Show last 10 operations
dock analytics --all        # Show all operations
```

---

## Shell Setup

```bash
dock init          # Set up shell integration (auto-pilot env vars)
dock autocomplete  # Set up tab completion
```

---

## All Commands

| Command | Description |
|---------|-------------|
| `dock create` | Create and provision environment |
| `dock create --snapshot` | Create from snapshot (fast) |
| `dock destroy` | Destroy all resources |
| `dock status` | Show current state |
| `dock start` | Power on stopped environment |
| `dock stop` | Gracefully shut down |
| `dock ssh [cmd]` | SSH into environment |
| `dock kubeconfig` | Fetch/update kubeconfig |
| `dock docker-env` | Print DOCKER_HOST export |
| `dock docker-tunnel` | Forward Docker socket |
| `dock portforward` | Forward ports |
| `dock configure` | Apply SSH config to remote |
| `dock connection` | Manage connections |
| `dock snapshot` | Manage snapshots |
| `dock env` | Manage environment variables |
| `dock analytics` | View usage statistics |
| `dock init` | Set up shell integration |
| `dock autocomplete` | Set up tab completion |
| `dock upgrade` | Upgrade to latest version |
| `dock version` | Show version |

Use `dock <command> --help` for detailed help on any command.

---

## Cost

| State | Cost |
|-------|------|
| **Running** | ~€7.99/month (DEV1-M) |
| **Stopped** | ~€1.60/month (disk only) |
| **Destroyed** | €0 |

---

## Architecture

```
┌──────────────┐
│   dock CLI   │  ← Bun/TypeScript
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Terraform + scw          │  ← IaC layer
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Scaleway Instance        │
│  - Ubuntu 22.04          │
│  - Docker                │
│  - k3s                   │
└──────────────────────────┘
```

---

## Installation Options

### One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/jiraguha/dock/main/install.sh | bash
```

### Manual download

Download from [Releases](https://github.com/jiraguha/dock/releases):

| Platform | Binary |
|----------|--------|
| Linux x64 | `dock-linux-x64` |
| Linux ARM64 | `dock-linux-arm64` |
| macOS x64 | `dock-darwin-x64` |
| macOS ARM64 | `dock-darwin-arm64` |

```bash
chmod +x dock-*
sudo mv dock-* /usr/local/bin/dock
```

### From source

```bash
git clone https://github.com/jiraguha/dock.git
cd dock
bun install
./bin/dock --help
```

---

## Roadmap

- [ ] **Automatic Shutdown (Kill Switch)** — Heartbeat mechanism to auto-shutdown inactive machines; destroy after 1 week of inactivity
- [x] **Single Executable CLI** — Package CLI as a self-contained executable
- [x] **Self-Upgrading CLI** — Automatic updates to latest version
- [ ] **Cliffy.io Integration** — Beautiful, clean CLI with enhanced UX
- [ ] **OpenClaw Safe Mode** — Restrict actions to safe, reversible, or sandboxed operations
- [ ] **MCP Integration** — Machine Control Protocol for advanced lifecycle management
- [ ] **Multi-Environment Support** — Manage multiple isolated environments (dev, staging, prod)
- [ ] **Multi-Provider VM Support** — AWS, GCP, Azure, and other providers
- [ ] **Web UI** — Web interface for managing environments and machines
- [ ] **NixOS Integration** — Declarative, reproducible development environments with Nix
- [ ] **Claude Code Integration** — AI-assisted development workflow with Claude Code

---

## License

MIT
