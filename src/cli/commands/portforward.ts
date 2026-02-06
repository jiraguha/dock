import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";
import {
  startPortForward,
  formatPortForwardCommand,
} from "../../core/portforward";

export async function portforward(args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state !== "running") {
    console.log(`Environment is not running (state: ${state.state})`);
    console.log("Run 'rdev start' first.");
    return;
  }

  const ip = state.details?.ip;
  if (!ip) {
    throw new Error("Could not determine instance IP");
  }

  const config = loadConfig();

  // Parse additional ports from args (e.g., rdev portforward 9000 9001)
  const additionalPorts = args
    .map((p) => parseInt(p, 10))
    .filter((p) => !isNaN(p) && p > 0 && p < 65536);

  const ports =
    additionalPorts.length > 0
      ? additionalPorts
      : config.forwardPorts;

  if (ports.length === 0) {
    console.log("No ports configured for forwarding.");
    console.log("Set FORWARD_PORTS=8080,3000,5432 in .env or pass ports as arguments.");
    return;
  }

  console.log("Starting port forwarding...");
  console.log(`Remote: ${ip}`);
  console.log(`Ports: ${ports.join(", ")}`);
  console.log("");

  // Show equivalent manual command
  const manualCmd = formatPortForwardCommand({
    ip,
    sshKeyPath: config.sshPrivateKeyPath,
    ports,
  });
  console.log("Equivalent command:");
  console.log(`  ${manualCmd}`);
  console.log("");

  try {
    const session = await startPortForward({
      ip,
      sshKeyPath: config.sshPrivateKeyPath,
      ports,
    });

    console.log("----------------------------------------");
    console.log("Port forwarding active!");
    console.log("----------------------------------------");
    for (const port of ports) {
      console.log(`  localhost:${port} -> ${ip}:${port}`);
    }
    console.log("----------------------------------------");
    console.log("Press Ctrl+C to stop");
    console.log("");

    // Handle graceful shutdown
    const cleanup = () => {
      console.log("\nStopping port forwarding...");
      session.stop();
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Port forwarding failed: ${message}`);
    process.exit(1);
  }
}
