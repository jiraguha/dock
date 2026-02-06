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

### Key Features

- **Disposable** — Destroy and recreate anytime, identical results every time
- **Zero cost when idle** — Power off or destroy when not in use
- **Feels local** — SSH, kubectl, and Docker CLI work transparently
- **Infrastructure as Code** — Terraform is the single source of truth
- **Port forwarding** — Access remote services on localhost

## Prerequisites

- [Terraform](https://terraform.io) CLI
- [Scaleway CLI](https://github.com/scaleway/scaleway-cli) (`scw`) - authenticated
- Scaleway API credentials (access key, secret key, project ID)
- SSH key pair (`~/.ssh/id_ed25519` by default)

## Installation

### One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/jiraguha/dock/main/install.sh | bash
```

This downloads the latest release binary and installs it to `/usr/local/bin/dock`.

### Manual download

Download the binary for your platform from [Releases](https://github.com/jiraguha/dock/releases):

| Platform | Binary |
|----------|--------|
| Linux x64 | `dock-linux-x64` |
| Linux ARM64 | `dock-linux-arm64` |
| macOS x64 | `dock-darwin-x64` |
| macOS ARM64 (M1/M2/M3) | `dock-darwin-arm64` |

```bash
chmod +x dock-*
sudo mv dock-* /usr/local/bin/dock
```

### Development setup

```bash
git clone https://github.com/jiraguha/dock.git
cd dock
bun install
./bin/dock --help
```

## Configuration

### Option 1: Using `.env` file (recommended)

Copy the example and edit:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
SCW_ACCESS_KEY=SCWXXXXXXXXXXXXXXXXX
SCW_SECRET_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SCW_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Option 2: Environment variables

```bash
export SCW_ACCESS_KEY=your_access_key
export SCW_SECRET_KEY=your_secret_key
export SCW_PROJECT_ID=your_project_id
```

### All configuration options

| Variable | Default | Description |
|----------|---------|-------------|
| `SCW_ACCESS_KEY` | (required) | Scaleway access key |
| `SCW_SECRET_KEY` | (required) | Scaleway secret key |
| `SCW_PROJECT_ID` | (required) | Scaleway project ID |
| `SSH_PUBLIC_KEY_PATH` | `~/.ssh/id_ed25519.pub` | Path to SSH public key |
| `SSH_PRIVATE_KEY_PATH` | `~/.ssh/id_ed25519` | Path to SSH private key |
| `SCW_REGION` | `fr-par` | Scaleway region |
| `SCW_ZONE` | `fr-par-1` | Scaleway zone |
| `SCW_INSTANCE_TYPE` | `DEV1-M` | Instance type |
| `SCW_INSTANCE_NAME` | `dock-env` | Instance name |
| `K8S_ENGINE` | `k3s` | Kubernetes engine (`k3s` or `kind`) |
| `USE_RESERVED_IP` | `false` | Use flexible IP for consistent address |
| `FORWARD_PORTS` | `8080,3000,5432,6379,27017` | Ports to forward from remote |

## Usage

### Create an environment

```bash
./bin/dock create
```

This will:
1. Create a Scaleway instance
2. Install Docker and k3s via cloud-init
3. Configure security group
4. Fetch kubeconfig to your local machine

### Check status

```bash
./bin/dock status
```

### SSH into the environment

```bash
./bin/dock ssh
```

Or run a command directly:

```bash
./bin/dock ssh "docker ps"
```

### Use kubectl

```bash
export KUBECONFIG=~/.kube/dock-config
kubectl get nodes
kubectl apply -f your-manifests/
```

### Use Docker remotely

```bash
eval $(./bin/dock docker-env)
docker ps
docker build -t myapp .
```

### Port forwarding

Forward ports from the remote environment to localhost:

```bash
# Foreground (blocks terminal)
./bin/dock portforward

# Background (daemon mode)
./bin/dock portforward -d

# Check status
./bin/dock portforward --status

# Stop background tunnel
./bin/dock portforward --stop

# Forward specific ports
./bin/dock portforward -d 8080 3000
```

Default ports: 8080, 3000, 5432, 6379, 27017. Configure via `FORWARD_PORTS` env var.

### Power off (preserves data)

```bash
./bin/dock stop
```

### Power on

```bash
./bin/dock start
```

### Destroy everything

```bash
./bin/dock destroy
```

## Commands

| Command | Description |
|---------|-------------|
| `dock create` | Create and provision a new environment |
| `dock destroy` | Destroy all resources (zero cost) |
| `dock status` | Show current environment state |
| `dock start` | Power on a stopped environment |
| `dock stop` | Gracefully shut down (preserves data) |
| `dock ssh [cmd]` | SSH into environment or run command |
| `dock kubeconfig` | Fetch/update local kubeconfig |
| `dock docker-env` | Print DOCKER_HOST export command |
| `dock portforward` | Forward ports from remote to local |
| `dock portforward -d` | Forward ports in background |
| `dock portforward --stop` | Stop background tunnel |
| `dock upgrade` | Upgrade dock to latest version |
| `dock upgrade --check` | Check for updates without installing |
| `dock autocomplete` | Set up shell autocompletion |

## Lifecycle States

| State | Description |
|-------|-------------|
| `absent` | No environment exists |
| `provisioning` | VM is being created |
| `running` | Environment is active |
| `stopped` | VM is powered off (data preserved) |
| `destroyed` | Resources deleted |

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

## Cost

- **Running**: ~€7.99/month for `DEV1-M` (3 vCPU, 4GB RAM)
- **Stopped**: ~€1.60/month (disk storage only)
- **Destroyed**: €0

## Roadmap

- [ ] **Automatic Shutdown (Kill Switch)** — Heartbeat mechanism to auto-shutdown inactive machines; destroy after 1 week of inactivity
- [x] **Single Executable CLI** — Package CLI as a self-contained executable
- [x] **Self-Upgrading CLI** — Automatic updates to latest version
- [ ] **OpenClaw Safe Mode** — Restrict actions to safe, reversible, or sandboxed operations
- [ ] **MCP Integration** — Machine Control Protocol for advanced lifecycle management
- [ ] **Multi-Environment Support** — Manage multiple isolated environments (dev, staging, prod)
- [ ] **Multi-Provider VM Support** — AWS, GCP, Azure, and other providers
- [ ] **Web UI** — Web interface for managing environments and machines

## License

MIT
