# Claude Context for rdev

This file provides context for Claude to understand and work with the rdev codebase.

## Project Overview

**rdev** is a CLI tool for managing disposable remote development environments on Scaleway. It allows developers to:

- Create remote VMs with Docker and k3s pre-installed
- Work remotely via SSH, kubectl, and Docker CLI
- Stop/start instances to save costs
- Destroy environments when done

## Architecture

```
bin/rdev                    # CLI entry point (shebang script)
src/
├── cli/
│   ├── index.ts            # Command router and help
│   └── commands/           # One file per command
│       ├── create.ts       # terraform apply + provision
│       ├── destroy.ts      # terraform destroy
│       ├── status.ts       # Show environment state
│       ├── start.ts        # Power on via scw CLI
│       ├── stop.ts         # Power off via scw CLI
│       ├── ssh.ts          # Open SSH session
│       ├── kubeconfig.ts   # Fetch k3s kubeconfig
│       ├── docker-env.ts   # Print DOCKER_HOST
│       └── portforward.ts  # SSH tunnel for port forwarding
├── core/
│   ├── config.ts           # Load config from env/.env
│   ├── terraform.ts        # Terraform CLI wrapper
│   ├── scw.ts              # Scaleway CLI wrapper
│   ├── state.ts            # Detect environment state
│   └── portforward.ts      # SSH tunnel management
├── provisioning/
│   └── kubeconfig.ts       # SCP and rewrite kubeconfig
└── types/
    └── index.ts            # TypeScript interfaces

terraform/
├── main.tf                 # Scaleway instance + IP
├── variables.tf            # Input variables
├── outputs.tf              # Terraform outputs
├── providers.tf            # Scaleway provider
├── versions.tf             # Provider versions
├── firewall.tf             # Security group rules
└── cloud-init/
    └── user-data.yaml.tftpl  # Docker + k3s provisioning

features/                   # Feature specifications
config/.env.example         # Environment variable template
```

## Key Concepts

### Environment States

| State | Meaning |
|-------|---------|
| `absent` | No Terraform state exists |
| `running` | Instance is powered on |
| `stopped` | Instance is powered off (data preserved) |
| `provisioning` | Instance is starting/stopping |
| `destroyed` | Instance deleted outside Terraform |

### External Dependencies

- **Terraform**: Infrastructure provisioning
- **scw CLI**: Scaleway API for power on/off
- **SSH**: Remote access and port forwarding
- **Bun**: TypeScript runtime

### Configuration

All config loaded from environment variables (see `src/core/config.ts`):
- `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_PROJECT_ID` (required)
- `SSH_PUBLIC_KEY_PATH`, `SSH_PRIVATE_KEY_PATH`
- `FORWARD_PORTS` (comma-separated port list)

## Common Tasks

### Adding a New Command

1. Create `src/cli/commands/newcmd.ts`:
```typescript
export async function newcmd(args: string[]): Promise<void> {
  // Implementation
}
```

2. Register in `src/cli/index.ts`:
```typescript
import { newcmd } from "./commands/newcmd";
const commands = { ..., newcmd };
```

3. Add help text in `printHelp()`

### Working with Terraform

Use wrappers in `src/core/terraform.ts`:
- `terraformInit()` - Initialize Terraform
- `terraformApply(vars)` - Create resources
- `terraformDestroy(vars)` - Destroy resources
- `terraformOutput()` - Get outputs

### Working with Scaleway CLI

Use wrappers in `src/core/scw.ts`:
- `runScw(args)` - Run any scw command
- `getInstanceState(id, zone)` - Query instance status
- `powerOn(id, zone)` - Power on instance
- `shutdown(id, zone)` - Power off instance

## Code Conventions

- **Runtime**: Bun (not Node.js)
- **Async/Await**: All I/O operations are async
- **Error Handling**: Throw errors with descriptive messages
- **Env Access**: Use `process.env["VAR_NAME"]` syntax
- **File Paths**: Use `join()` from `path` module
- **Spawning**: Use `spawn` from `bun` package

## Testing Commands

```bash
./bin/rdev status           # Check environment
./bin/rdev create           # Create new environment
./bin/rdev ssh              # Connect to environment
./bin/rdev portforward -d   # Forward ports in background
./bin/rdev stop             # Power off
./bin/rdev destroy          # Delete everything
```

## Feature Specs

New features are documented in `features/*.md` before implementation.
