import { spawn } from "bun";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { detectState } from "../../core/state";
import { loadConfig, DOCK_HOME } from "../../core/config";

const SOCKET_DIR = join(DOCK_HOME, "sockets");
const DOCKER_SOCKET_PATH = join(SOCKET_DIR, "docker.sock");
const PID_FILE = join(DOCK_HOME, "docker-tunnel.pid");

export async function dockerTunnel(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock docker-tunnel [options]");
    console.log("");
    console.log("Forward Docker socket from remote to local via SSH tunnel.");
    console.log("Recommended for heavy Docker usage (many containers).");
    console.log("");
    console.log("Options:");
    console.log("  -d, --daemon   Run tunnel in background");
    console.log("  --stop         Stop the background tunnel");
    console.log("  --status       Show tunnel status");
    console.log("  --help, -h     Show this help");
    console.log("");
    console.log("Examples:");
    console.log("  dock docker-tunnel        # Start in foreground");
    console.log("  dock docker-tunnel -d     # Start in background");
    console.log("  dock docker-tunnel --stop # Stop background tunnel");
    return;
  }

  const stopFlag = args.includes("--stop");
  const statusFlag = args.includes("--status");
  const daemon = args.includes("-d") || args.includes("--daemon");

  if (statusFlag) {
    await showStatus();
    return;
  }

  if (stopFlag) {
    await stopTunnel();
    return;
  }

  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot start docker tunnel: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'dock start' first."
          : "Run 'dock create' first.")
    );
  }

  const ip = state.details?.ip;
  if (!ip) {
    throw new Error("Could not determine instance IP");
  }

  // Check if tunnel is already running
  if (await isTunnelRunning()) {
    console.log("Docker tunnel is already running.");
    console.log(`Use: export DOCKER_HOST=unix://${DOCKER_SOCKET_PATH}`);
    return;
  }

  const config = loadConfig();

  // Ensure socket directory exists
  if (!existsSync(SOCKET_DIR)) {
    mkdirSync(SOCKET_DIR, { recursive: true });
  }

  // Remove stale socket if it exists
  if (existsSync(DOCKER_SOCKET_PATH)) {
    try {
      unlinkSync(DOCKER_SOCKET_PATH);
    } catch {
      // Ignore
    }
  }

  console.log("Starting Docker socket tunnel...");
  console.log(`Remote: ${ip}`);
  console.log(`Local socket: ${DOCKER_SOCKET_PATH}`);
  console.log("");

  const sshArgs = [
    "-i", config.sshPrivateKeyPath,
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-N", // No command
    "-L", `${DOCKER_SOCKET_PATH}:/var/run/docker.sock`,
    `root@${ip}`,
  ];

  if (daemon) {
    // Run in background
    const proc = spawn({
      cmd: ["ssh", "-f", ...sshArgs],
      stdout: "inherit",
      stderr: "inherit",
    });

    await proc.exited;

    // Wait for socket to appear
    let attempts = 0;
    while (!existsSync(DOCKER_SOCKET_PATH) && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!existsSync(DOCKER_SOCKET_PATH)) {
      throw new Error("Failed to start Docker tunnel - socket not created");
    }

    // Find and save PID
    const pidProc = spawn({
      cmd: ["pgrep", "-f", `ssh.*${DOCKER_SOCKET_PATH}`],
      stdout: "pipe",
      stderr: "pipe",
    });
    const pidOutput = await new Response(pidProc.stdout).text();
    await pidProc.exited;

    const pid = pidOutput.trim().split("\n")[0];
    if (pid) {
      await Bun.write(PID_FILE, pid);
    }

    console.log("Docker tunnel started in background.");
    console.log("");
    console.log("To use Docker:");
    console.log(`  export DOCKER_HOST=unix://${DOCKER_SOCKET_PATH}`);
    console.log("");
    console.log("Or add to your shell:");
    console.log(`  eval $(dock docker-tunnel --env)`);
    console.log("");
    console.log("To stop:");
    console.log("  dock docker-tunnel --stop");
  } else {
    // Run in foreground
    console.log("----------------------------------------");
    console.log("Docker socket tunnel active!");
    console.log(`Use: export DOCKER_HOST=unix://${DOCKER_SOCKET_PATH}`);
    console.log("----------------------------------------");
    console.log("Press Ctrl+C to stop");
    console.log("");

    const proc = spawn({
      cmd: ["ssh", ...sshArgs],
      stdout: "inherit",
      stderr: "inherit",
    });

    // Handle cleanup
    process.on("SIGINT", () => {
      proc.kill("SIGTERM");
      cleanupSocket();
    });
    process.on("SIGTERM", () => {
      proc.kill("SIGTERM");
      cleanupSocket();
    });

    const exitCode = await proc.exited;
    cleanupSocket();

    if (exitCode !== 0) {
      console.log(`SSH tunnel exited with code ${exitCode}`);
    }
  }
}

async function isTunnelRunning(): Promise<boolean> {
  if (!existsSync(PID_FILE)) return false;

  const pid = await Bun.file(PID_FILE).text();
  if (!pid.trim()) return false;

  try {
    // Check if process exists
    process.kill(parseInt(pid.trim()), 0);
    return true;
  } catch {
    // Process doesn't exist, clean up
    unlinkSync(PID_FILE);
    return false;
  }
}

async function showStatus(): Promise<void> {
  if (await isTunnelRunning()) {
    const pid = await Bun.file(PID_FILE).text();
    console.log("Docker tunnel: running");
    console.log(`  PID: ${pid.trim()}`);
    console.log(`  Socket: ${DOCKER_SOCKET_PATH}`);
    console.log("");
    console.log(`Use: export DOCKER_HOST=unix://${DOCKER_SOCKET_PATH}`);
  } else {
    console.log("Docker tunnel: not running");
    console.log("Run 'dock docker-tunnel' or 'dock docker-tunnel -d' to start.");
  }
}

async function stopTunnel(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    console.log("No Docker tunnel is running.");
    return;
  }

  const pid = await Bun.file(PID_FILE).text();
  if (!pid.trim()) {
    console.log("No Docker tunnel is running.");
    return;
  }

  try {
    process.kill(parseInt(pid.trim()), "SIGTERM");
    console.log("Docker tunnel stopped.");
  } catch {
    console.log("Docker tunnel was not running.");
  }

  cleanupSocket();
  try {
    unlinkSync(PID_FILE);
  } catch {
    // Ignore
  }
}

function cleanupSocket(): void {
  if (existsSync(DOCKER_SOCKET_PATH)) {
    try {
      unlinkSync(DOCKER_SOCKET_PATH);
    } catch {
      // Ignore
    }
  }
}
