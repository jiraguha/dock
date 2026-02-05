import { create } from "./commands/create";
import { destroy } from "./commands/destroy";
import { status } from "./commands/status";
import { ssh } from "./commands/ssh";
import { start } from "./commands/start";
import { stop } from "./commands/stop";
import { kubeconfig } from "./commands/kubeconfig";
import { dockerEnv } from "./commands/docker-env";

const commands: Record<string, (args: string[]) => Promise<void>> = {
  create,
  destroy,
  status,
  ssh,
  start,
  stop,
  kubeconfig,
  "docker-env": dockerEnv,
};

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log("rdev 0.1.0");
    process.exit(0);
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "rdev --help" for usage information.');
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
rdev - Disposable Remote Development Environment

Usage: rdev <command> [options]

Commands:
  create        Create and provision environment
  destroy       Destroy all resources
  status        Show current state
  ssh           Open SSH connection
  start         Power on stopped instance
  stop          Gracefully shutdown instance
  kubeconfig    Fetch/update local kubeconfig
  docker-env    Print DOCKER_HOST export command

Options:
  -h, --help     Show this help
  -v, --version  Show version

Environment:
  SCW_ACCESS_KEY   Scaleway access key (required)
  SCW_SECRET_KEY   Scaleway secret key (required)
  SCW_PROJECT_ID   Scaleway project ID (required)

Examples:
  rdev create              # Create new environment
  rdev ssh                 # SSH into environment
  rdev stop                # Power off (preserves data)
  rdev start               # Power back on
  rdev destroy             # Delete everything
  eval $(rdev docker-env)  # Configure Docker CLI
`);
}
