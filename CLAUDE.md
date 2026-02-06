# Claude Context for rdev

This file provides context for Claude to understand and work with the rdev codebase.

## Specs-Driven Development

**THIS PROJECT IS SPECS-DRIVEN.** This is the most important principle:

1. **Read specs first**: Before implementing anything, check `features/*.md` for specifications
2. **Write specs before code**: New features MUST have a spec file in `features/` before implementation
3. **Specs are the source of truth**: If code doesn't match specs, the code is wrong
4. **Reference specs in commits**: Link to the spec file when implementing features

### Spec File Format

```markdown
# features/XX_feature-name.specs.md

### Feature Name

Description of what needs to be built and why.

1. Requirement one
2. Requirement two
3. ...
```

### Workflow

```
1. Create spec in features/XX_name.specs.md
2. Review and refine requirements
3. Implement according to spec
4. Commit with reference to spec
5. Update spec if requirements change
```

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
├── core/                   # Core business logic
├── provisioning/           # Remote provisioning helpers
└── types/
    └── index.ts            # TypeScript interfaces

terraform/                  # Infrastructure as Code
├── main.tf                 # Scaleway instance + IP
├── variables.tf            # Input variables
├── outputs.tf              # Terraform outputs
└── cloud-init/
    └── user-data.yaml.tftpl  # Docker + k3s provisioning

features/                   # Feature specifications (READ FIRST!)
config/.env.example         # Environment variable template
```

## TypeScript Best Practices

### Type Safety

```typescript
// DO: Use explicit types for function signatures
export async function start(args: string[]): Promise<void>

// DO: Use interfaces for structured data
interface Config {
  scwAccessKey: string;
  forwardPorts: number[];
}

// DO: Use type guards for runtime checks
if (state.state === "running") {
  // TypeScript knows state.details has ip
}

// DON'T: Use `any` - use `unknown` and narrow
// DON'T: Ignore TypeScript errors with @ts-ignore
```

### Async Patterns

```typescript
// DO: Always use async/await (not .then())
const output = await runScw(["instance", "server", "get", id]);

// DO: Handle errors with try/catch
try {
  await terraformApply(vars);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message}`);
}

// DO: Run independent operations in parallel
const [status, ip] = await Promise.all([
  getInstanceState(id, zone),
  getInstanceIp(id, zone),
]);
```

### Project Patterns

```typescript
// Environment variables - use bracket notation
const key = process.env["SCW_ACCESS_KEY"];

// File paths - always use join()
import { join } from "path";
const configPath = join(homedir(), ".rdev", "config.json");

// Spawning processes - use Bun's spawn
import { spawn } from "bun";
const proc = spawn({ cmd: ["ssh", ...args], stdout: "pipe" });
```

## Bun Best Practices

### Use Bun APIs

```typescript
// File I/O - use Bun.file() and Bun.write()
const file = Bun.file(path);
const content = await file.text();
await Bun.write(path, JSON.stringify(data, null, 2));

// Check file exists
const exists = await file.exists();

// Spawn processes
import { spawn } from "bun";
const proc = spawn({
  cmd: ["terraform", "apply"],
  stdout: "pipe",
  stderr: "pipe",
  env: { ...process.env, TF_VAR_foo: "bar" },
});
const output = await new Response(proc.stdout).text();
await proc.exited;
```

### Bun-Specific Considerations

- Use `import.meta.dir` for __dirname equivalent
- Use `Bun.spawn` not `child_process`
- Bun has native TypeScript support - no compilation step
- Use `bun run` for scripts in package.json

## Terraform Best Practices

### File Organization

```
terraform/
├── versions.tf      # Required providers and versions (FIRST)
├── providers.tf     # Provider configuration
├── variables.tf     # Input variables with descriptions
├── main.tf          # Primary resources
├── firewall.tf      # Security groups (separate concern)
├── outputs.tf       # Outputs for CLI consumption
└── cloud-init/      # Templates in subdirectory
```

### Variable Conventions

```hcl
# Always include description and type
variable "instance_type" {
  description = "Scaleway instance type"
  type        = string
  default     = "DEV1-M"
}

# Use validation where appropriate
variable "zone" {
  description = "Scaleway zone"
  type        = string
  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]{3}-[0-9]$", var.zone))
    error_message = "Zone must be in format: xx-xxx-N"
  }
}
```

### Resource Patterns

```hcl
# Use consistent naming
resource "scaleway_instance_server" "rdev" {
  name = var.instance_name
  # ...
}

# Use locals for computed values
locals {
  public_ip = var.use_reserved_ip ? resource.ip[0].address : resource.dynamic[0].address
}

# Output everything the CLI needs
output "instance_id" {
  value = scaleway_instance_server.rdev.id
}
```

### State Management

- Terraform state is stored locally in `terraform/terraform.tfstate`
- State is the source of truth for what exists
- Use `terraform output -json` to query state from CLI
- Never edit state files manually

## Code Conventions

- **Runtime**: Bun (not Node.js)
- **Async/Await**: All I/O operations are async
- **Error Handling**: Throw errors with descriptive messages
- **Env Access**: Use `process.env["VAR_NAME"]` syntax
- **File Paths**: Use `join()` from `path` module
- **Spawning**: Use `spawn` from `bun` package
- **No Comments**: Code should be self-documenting; only add comments for non-obvious logic

## Adding New Features

### 1. Write the Spec First

Create `features/XX_feature-name.specs.md`:

```markdown
### Feature Name

Description of the feature and why it's needed.

1. First requirement
2. Second requirement
3. ...
```

### 2. Implement According to Spec

- Create command in `src/cli/commands/`
- Add core logic in `src/core/` if reusable
- Register in `src/cli/index.ts`
- Update help text

### 3. Update Documentation

- Add to README.md usage section
- Add to commands table
- Update CLAUDE.md if patterns change

### 4. Commit with Spec Reference

```
feat: Add feature-name per features/XX_feature-name.specs.md
```

## Testing Commands

```bash
./bin/rdev status           # Check environment
./bin/rdev create           # Create new environment
./bin/rdev ssh              # Connect to environment
./bin/rdev portforward -d   # Forward ports in background
./bin/rdev stop             # Power off
./bin/rdev destroy          # Delete everything
bun run tsc --noEmit        # Type check
```

## Key Files to Read First

1. `features/*.md` - **Specifications (read these first!)**
2. `src/types/index.ts` - Type definitions
3. `src/core/config.ts` - Configuration loading
4. `src/cli/index.ts` - Command routing
5. `terraform/main.tf` - Infrastructure definition
