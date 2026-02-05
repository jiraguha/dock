# rdev

Disposable remote development environments on DigitalOcean.

**Create → Work → Stop → Resume → Destroy** — with zero local resource consumption.

## Why

Local Docker and Kubernetes consume CPU, memory, and battery. Your laptop gets hot, fans spin, and battery drains. This tool moves that workload to a remote VM that you control completely.

- **Disposable**: Destroy and recreate anytime, same result
- **Zero cost when idle**: Power off or destroy when not in use
- **Feels local**: SSH, kubectl, and docker CLI work transparently
- **Infrastructure as Code**: Terraform is the single source of truth

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Terraform](https://terraform.io) CLI
- [doctl](https://docs.digitalocean.com/reference/doctl/) CLI (authenticated)
- DigitalOcean API token
- SSH key pair (`~/.ssh/id_ed25519` by default)

## Installation

```bash
git clone <repo-url>
cd remote-container
bun install
```

## Configuration

Set your DigitalOcean API token:

```bash
export DO_TOKEN=your_token_here
```

Optional environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DO_TOKEN` | (required) | DigitalOcean API token |
| `SSH_PUBLIC_KEY_PATH` | `~/.ssh/id_ed25519.pub` | Path to SSH public key |
| `SSH_PRIVATE_KEY_PATH` | `~/.ssh/id_ed25519` | Path to SSH private key |
| `DO_REGION` | `nyc1` | DigitalOcean region |
| `DO_DROPLET_SIZE` | `s-2vcpu-4gb` | Droplet size |
| `DO_DROPLET_NAME` | `rdev-env` | Droplet name |
| `K8S_ENGINE` | `k3s` | Kubernetes engine (`k3s` or `kind`) |
| `USE_RESERVED_IP` | `false` | Use reserved IP for consistent address |

## Usage

### Create an environment

```bash
./bin/rdev create
```

This will:
1. Create a DigitalOcean droplet
2. Install Docker and k3s via cloud-init
3. Configure firewall rules
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
│ Terraform + doctl        │  ← IaC layer
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ DigitalOcean Droplet     │
│  - Ubuntu 24.04          │
│  - Docker                │
│  - k3s                   │
└──────────────────────────┘
```

## Cost

- **Running**: ~$24/month for `s-2vcpu-4gb` ($0.036/hour)
- **Stopped**: ~$4.80/month (disk storage only)
- **Destroyed**: $0

## License

MIT
