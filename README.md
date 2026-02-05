# rdev

Disposable remote development environments on Scaleway.

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

## License

MIT
