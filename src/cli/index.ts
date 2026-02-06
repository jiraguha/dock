import { create } from "./commands/create";
import { destroy } from "./commands/destroy";
import { status } from "./commands/status";
import { ssh } from "./commands/ssh";
import { start } from "./commands/start";
import { stop } from "./commands/stop";
import { kubeconfig } from "./commands/kubeconfig";
import { dockerEnv } from "./commands/docker-env";
import { portforward } from "./commands/portforward";
import { configure } from "./commands/configure";
import { upgrade } from "./commands/upgrade";
import { version } from "./commands/version";
import { loadDockEnv, DOCK_HOME, getTerraformDir, getSourceTerraformDir } from "../core/config";
import { VERSION } from "../core/upgrade";
import { existsSync, mkdirSync, cpSync } from "fs";

const commands: Record<string, (args: string[]) => Promise<void>> = {
  create,
  destroy,
  status,
  ssh,
  start,
  stop,
  kubeconfig,
  "docker-env": dockerEnv,
  portforward,
  configure,
  upgrade,
  version,
};

async function ensureDockHome(): Promise<void> {
  // Create ~/.dock if it doesn't exist
  if (!existsSync(DOCK_HOME)) {
    mkdirSync(DOCK_HOME, { recursive: true });
  }

  // Copy terraform files to ~/.dock/terraform if not present
  const terraformDir = getTerraformDir();
  const sourceTerraformDir = getSourceTerraformDir();

  if (!existsSync(terraformDir) && existsSync(sourceTerraformDir)) {
    cpSync(sourceTerraformDir, terraformDir, { recursive: true });
  }
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log(`dock ${VERSION}`);
    process.exit(0);
  }

  // Initialize dock home and load environment
  await ensureDockHome();
  await loadDockEnv();

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "dock --help" for usage information.');
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
dock - Disposable Remote Development Environment

Usage: dock <command> [options]

Commands:
  create        Create and provision environment
  destroy       Destroy all resources
  status        Show current state
  ssh           Open SSH connection
  start         Power on stopped instance
  stop          Gracefully shutdown instance
  kubeconfig    Fetch/update local kubeconfig
  docker-env    Print DOCKER_HOST export command
  portforward   Forward ports from remote to local
  configure     Apply SSH server config to remote
  upgrade       Upgrade dock to latest version
  version       Show current version

Options:
  -h, --help     Show this help
  -v, --version  Show version

Environment (set in ~/.dock/.env or export):
  SCW_ACCESS_KEY     Scaleway access key (required)
  SCW_SECRET_KEY     Scaleway secret key (required)
  SCW_PROJECT_ID     Scaleway project ID (required)
  FORWARD_PORTS      Comma-separated ports to forward (default: 8080,3000,5432,6379,27017)
  SSH_MAX_STARTUPS   SSH MaxStartups setting (default: 10:30:100)
  SSH_MAX_SESSIONS   SSH MaxSessions setting (default: 20)

Examples:
  dock create              # Create new environment
  dock ssh                 # SSH into environment
  dock stop                # Power off (preserves data)
  dock start               # Power back on
  dock destroy             # Delete everything
  eval $(dock docker-env)  # Configure Docker CLI
  dock portforward         # Forward ports (foreground)
  dock portforward -d      # Forward ports (background/daemon)
  dock portforward --stop  # Stop background tunnel
  dock portforward 9000    # Forward specific port(s)
  dock configure           # Apply SSH config to remote
  dock configure --show    # Show remote SSH config
  dock version             # Show current version
  dock upgrade --check     # Check if update available
  dock upgrade             # Upgrade to latest version
`);
}

// Run main when executed directly (not imported)
if (import.meta.main) {
  main();
}
