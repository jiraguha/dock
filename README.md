<div align="center">

```
                 _
   _ __ ___   __| | _____   __
  | '__/ _ \ / _` |/ _ \ \ / /
  | | | (_) | (_| |  __/\ V /
  |_|  \___/ \__,_|\___| \_/

```

# rdev

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

## Why rdev?

Running Docker and Kubernetes locally drains your battery, spins up fans, and turns your laptop into a space heater. **rdev** moves all that to a remote VM you fully control.

| | Local Dev | rdev |
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

- [Bun](https://bun.sh) runtime
- [Terraform](https://terraform.io) CLI
- [Scaleway CLI](https://github.com/scaleway/scaleway-cli) (`scw`) - authenticated
- Scaleway API credentials (access key, secret key, project ID)
- SSH key pair (`~/.ssh/id_ed25519` by default)

## Installation

```bash
git clone <repo-url>
cd remote-container
bun install
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
| `SCW_INSTANCE_NAME` | `rdev-env` | Instance name |
| `K8S_ENGINE` | `k3s` | Kubernetes engine (`k3s` or `kind`) |
| `USE_RESERVED_IP` | `false` | Use flexible IP for consistent address |
| `FORWARD_PORTS` | `8080,3000,5432,6379,27017` | Ports to forward from remote |

## Usage

### Create an environment

```bash
./bin/rdev create
```

This will:
1. Create a Scaleway instance
2. Install Docker and k3s via cloud-init
3. Configure security group
4. Fetch kubeconfig to your local machine

### Check status

```bash
./bin/rdev status
```

### SSH into the environment

```bash
./bin/rdev ssh
```

Or run a command directly:

```bash
./bin/rdev ssh "docker ps"
```

### Use kubectl

```bash
export KUBECONFIG=~/.kube/rdev-config
kubectl get nodes
kubectl apply -f your-manifests/
```

### Use Docker remotely

```bash
eval $(./bin/rdev docker-env)
docker ps
docker build -t myapp .
```

### Port forwarding

Forward ports from the remote environment to localhost:

```bash
# Foreground (blocks terminal)
./bin/rdev portforward

# Background (daemon mode)
./bin/rdev portforward -d

# Check status
./bin/rdev portforward --status

# Stop background tunnel
./bin/rdev portforward --stop

# Forward specific ports
./bin/rdev portforward -d 8080 3000
```

Default ports: 8080, 3000, 5432, 6379, 27017. Configure via `FORWARD_PORTS` env var.

### Power off (preserves data)

```bash
./bin/rdev stop
```

### Power on

```bash
./bin/rdev start
```

### Destroy everything

```bash
./bin/rdev destroy
```

## Commands

| Command | Description |
|---------|-------------|
| `rdev create` | Create and provision a new environment |
| `rdev destroy` | Destroy all resources (zero cost) |
| `rdev status` | Show current environment state |
| `rdev start` | Power on a stopped environment |
| `rdev stop` | Gracefully shut down (preserves data) |
| `rdev ssh [cmd]` | SSH into environment or run command |
| `rdev kubeconfig` | Fetch/update local kubeconfig |
| `rdev docker-env` | Print DOCKER_HOST export command |
| `rdev portforward` | Forward ports from remote to local |
| `rdev portforward -d` | Forward ports in background |
| `rdev portforward --stop` | Stop background tunnel |

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
│   rdev CLI   │  ← Bun/TypeScript
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
- [ ] **Single Executable CLI** — Package CLI as a self-contained executable
- [ ] **Self-Upgrading CLI** — Automatic updates to latest version
- [ ] **OpenClaw Safe Mode** — Restrict actions to safe, reversible, or sandboxed operations
- [ ] **MCP Integration** — Machine Control Protocol for advanced lifecycle management
- [ ] **Multi-Environment Support** — Manage multiple isolated environments (dev, staging, prod)
- [ ] **Multi-Provider VM Support** — AWS, GCP, Azure, and other providers
- [ ] **Web UI** — Web interface for managing environments and machines

## License

MIT
