import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";
import {
  startPortForward,
  formatPortForwardCommand,
  getRunningTunnel,
  stopRunningTunnel,
} from "../../core/portforward";

export async function portforward(args: string[]): Promise<void> {
  // Check for --help flag first
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock portforward [options] [ports...]");
    console.log("");
    console.log("Forward ports from the remote environment to localhost.");
    console.log("");
    console.log("Options:");
    console.log("  -d, --daemon     Run in background");
    console.log("  --stop           Stop background tunnel");
    console.log("  --status         Show tunnel status");
    console.log("  --help, -h       Show this help");
    console.log("");
    console.log("Arguments:");
    console.log("  ports            Specific ports to forward (default: FORWARD_PORTS env)");
    console.log("");
    console.log("Examples:");
    console.log("  dock portforward           # Forward default ports (foreground)");
    console.log("  dock portforward -d        # Forward in background");
    console.log("  dock portforward 8080 3000 # Forward specific ports");
    console.log("  dock portforward --stop    # Stop background tunnel");
    return;
  }

  // Check for --stop flag
  if (args.includes("--stop") || args.includes("-s")) {
    await handleStop();
    return;
  }

  // Check for --status flag
  if (args.includes("--status")) {
    await handleStatus();
    return;
  }

  // Check for background/daemon mode
  const background = args.includes("-d") || args.includes("--daemon") || args.includes("--background");

  // Filter out flags to get port numbers
  const portArgs = args.filter((a) => !a.startsWith("-"));

  const state = await detectState();

  if (state.state !== "running") {
    console.log(`Environment is not running (state: ${state.state})`);
    console.log("Run 'dock start' first.");
    return;
  }

  const ip = state.details?.ip;
  if (!ip) {
    throw new Error("Could not determine instance IP");
  }

  // Check if tunnel is already running
  const existing = await getRunningTunnel();
  if (existing) {
    console.log("Port forwarding is already running:");
    console.log(`  PID: ${existing.pid}`);
    console.log(`  Ports: ${existing.ports.join(", ")}`);
    console.log(`  Started: ${existing.startedAt}`);
    console.log("");
    console.log("Use 'dock portforward --stop' to stop it first.");
    return;
  }

  const config = loadConfig();

  // Parse port numbers from args
  const additionalPorts = portArgs
    .map((p) => parseInt(p, 10))
    .filter((p) => !isNaN(p) && p > 0 && p < 65536);

  const ports = additionalPorts.length > 0 ? additionalPorts : config.forwardPorts;

  if (ports.length === 0) {
    console.log("No ports configured for forwarding.");
    console.log("Set FORWARD_PORTS=8080,3000,5432 in .env or pass ports as arguments.");
    return;
  }

  console.log("Starting port forwarding...");
  console.log(`Remote: ${ip}`);
  console.log(`Ports: ${ports.join(", ")}`);
  console.log(`Mode: ${background ? "background" : "foreground"}`);
  console.log("");

  // Show equivalent manual command
  const manualCmd = formatPortForwardCommand({
    ip,
    sshKeyPath: config.sshPrivateKeyPath,
    ports,
    background,
  });
  console.log("Equivalent command:");
  console.log(`  ${manualCmd}`);
  console.log("");

  try {
    const session = await startPortForward({
      ip,
      sshKeyPath: config.sshPrivateKeyPath,
      ports,
      background,
    });

    console.log("----------------------------------------");
    console.log("Port forwarding active!");
    console.log("----------------------------------------");
    for (const port of ports) {
      console.log(`  localhost:${port} -> ${ip}:${port}`);
    }
    console.log("----------------------------------------");

    if (background) {
      console.log(`PID: ${session.pid}`);
      console.log("");
      console.log("Running in background. Use 'dock portforward --stop' to stop.");
    } else {
      console.log("Press Ctrl+C to stop");
      console.log("");

      // Handle graceful shutdown
      const cleanup = async () => {
        console.log("\nStopping port forwarding...");
        await session.stop();
        process.exit(0);
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      // Wait for the SSH process to exit
      await session.process.exited;

      const exitCode = session.process.exitCode;
      if (exitCode !== 0 && exitCode !== null) {
        console.log(`SSH tunnel exited with code ${exitCode}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Port forwarding failed: ${message}`);
    process.exit(1);
  }
}

async function handleStop(): Promise<void> {
  const stopped = await stopRunningTunnel();
  if (stopped) {
    console.log("Port forwarding stopped.");
  } else {
    console.log("No port forwarding tunnel is running.");
  }
}

async function handleStatus(): Promise<void> {
  const info = await getRunningTunnel();
  if (info) {
    console.log("Port forwarding is running:");
    console.log(`  PID: ${info.pid}`);
    console.log(`  Remote: ${info.ip}`);
    console.log(`  Ports: ${info.ports.join(", ")}`);
    console.log(`  Started: ${info.startedAt}`);
  } else {
    console.log("No port forwarding tunnel is running.");
  }
}
