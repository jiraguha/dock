import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { spawn } from "bun";
import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";

const SSH_DIR = join(homedir(), ".ssh");
const SSH_CONFIG_PATH = join(SSH_DIR, "config");
const SSH_SOCKETS_DIR = join(SSH_DIR, "sockets");
const DOCK_HOST_MARKER = "# dock-managed-start";
const DOCK_HOST_MARKER_END = "# dock-managed-end";

export async function sshConfig(args: string[]): Promise<void> {
  const removeFlag = args.includes("--remove");
  const showFlag = args.includes("--show");
  const startMasterFlag = args.includes("--start-master");
  const stopMasterFlag = args.includes("--stop-master");

  if (showFlag) {
    await showConfig();
    return;
  }

  if (removeFlag) {
    await removeConfig();
    return;
  }

  if (stopMasterFlag) {
    await stopMaster();
    return;
  }

  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot configure SSH: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'dock start' first."
          : "Run 'dock create' first.")
    );
  }

  const ip = state.details?.ip;
  if (!ip) {
    throw new Error("Could not determine instance IP");
  }

  const config = loadConfig();

  if (startMasterFlag) {
    await startMaster(ip, config.sshPrivateKeyPath);
    return;
  }

  // Set up SSH config with ControlMaster
  await setupConfig(ip, config.sshPrivateKeyPath);
}

async function setupConfig(ip: string, sshKeyPath: string): Promise<void> {
  // Ensure SSH directory exists
  if (!existsSync(SSH_DIR)) {
    mkdirSync(SSH_DIR, { mode: 0o700 });
  }

  // Ensure sockets directory exists
  if (!existsSync(SSH_SOCKETS_DIR)) {
    mkdirSync(SSH_SOCKETS_DIR, { mode: 0o700 });
  }

  // Read existing config
  let existingConfig = "";
  if (existsSync(SSH_CONFIG_PATH)) {
    existingConfig = readFileSync(SSH_CONFIG_PATH, "utf-8");
  }

  // Remove any existing dock config
  existingConfig = removeDockConfig(existingConfig);

  // Create dock host config with ControlMaster
  const dockConfig = `
${DOCK_HOST_MARKER}
# Dock remote development environment
# Enables SSH connection multiplexing for Docker over SSH
Host dock
  HostName ${ip}
  User root
  IdentityFile ${sshKeyPath}
  StrictHostKeyChecking accept-new
  # Connection multiplexing - reuses single SSH connection
  ControlMaster auto
  ControlPath ${SSH_SOCKETS_DIR}/dock-%r@%h-%p
  ControlPersist 600
  # Keep connection alive
  ServerAliveInterval 30
  ServerAliveCountMax 3
${DOCK_HOST_MARKER_END}
`;

  // Write updated config
  const newConfig = existingConfig.trimEnd() + "\n" + dockConfig;
  writeFileSync(SSH_CONFIG_PATH, newConfig, { mode: 0o600 });

  console.log("SSH config updated with ControlMaster support.");
  console.log("");
  console.log("Now use Docker with the 'dock' host alias:");
  console.log("  export DOCKER_HOST=ssh://dock");
  console.log("");
  console.log("This reuses a single SSH connection for all Docker commands,");
  console.log("preventing 'Connection reset by peer' errors.");
  console.log("");
  console.log("To start the master connection immediately:");
  console.log("  dock ssh-config --start-master");
  console.log("");
  console.log("To remove this config:");
  console.log("  dock ssh-config --remove");
}

function removeDockConfig(config: string): string {
  const startIdx = config.indexOf(DOCK_HOST_MARKER);
  const endIdx = config.indexOf(DOCK_HOST_MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    return config;
  }

  const before = config.substring(0, startIdx);
  const after = config.substring(endIdx + DOCK_HOST_MARKER_END.length);

  return (before + after).replace(/\n{3,}/g, "\n\n");
}

async function removeConfig(): Promise<void> {
  if (!existsSync(SSH_CONFIG_PATH)) {
    console.log("No SSH config found.");
    return;
  }

  let config = readFileSync(SSH_CONFIG_PATH, "utf-8");
  const newConfig = removeDockConfig(config);

  if (config === newConfig) {
    console.log("No dock SSH config found to remove.");
    return;
  }

  writeFileSync(SSH_CONFIG_PATH, newConfig, { mode: 0o600 });

  // Clean up socket if exists
  await cleanupSocket();

  console.log("Dock SSH config removed.");
}

async function showConfig(): Promise<void> {
  if (!existsSync(SSH_CONFIG_PATH)) {
    console.log("No SSH config found.");
    return;
  }

  const config = readFileSync(SSH_CONFIG_PATH, "utf-8");
  const startIdx = config.indexOf(DOCK_HOST_MARKER);
  const endIdx = config.indexOf(DOCK_HOST_MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    console.log("No dock SSH config found.");
    console.log("Run 'dock ssh-config' to set up connection multiplexing.");
    return;
  }

  const dockConfig = config.substring(startIdx, endIdx + DOCK_HOST_MARKER_END.length);
  console.log("Current dock SSH config:");
  console.log(dockConfig);

  // Check if master connection is active
  const socketPath = join(SSH_SOCKETS_DIR, "dock-root@*");
  const proc = spawn({
    cmd: ["sh", "-c", `ls ${SSH_SOCKETS_DIR}/dock-* 2>/dev/null | head -1`],
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  if (output.trim()) {
    console.log("");
    console.log("Master connection: active");
    console.log(`Socket: ${output.trim()}`);
  } else {
    console.log("");
    console.log("Master connection: not active");
    console.log("Run 'dock ssh-config --start-master' to start it.");
  }
}

async function startMaster(ip: string, sshKeyPath: string): Promise<void> {
  console.log("Starting SSH master connection...");

  // First ensure config is set up
  await setupConfig(ip, sshKeyPath);

  // Start master connection in background
  const proc = spawn({
    cmd: [
      "ssh",
      "-f", // Background
      "-N", // No command
      "-M", // Master mode
      "-o", `ControlPath=${SSH_SOCKETS_DIR}/dock-%r@%h-%p`,
      "dock",
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log("SSH master connection started.");
    console.log("");
    console.log("Now use:");
    console.log("  export DOCKER_HOST=ssh://dock");
    console.log("  supabase start  # Should work without connection issues");
  } else {
    throw new Error("Failed to start SSH master connection");
  }
}

async function stopMaster(): Promise<void> {
  console.log("Stopping SSH master connection...");

  const proc = spawn({
    cmd: [
      "ssh",
      "-O", "exit",
      "-o", `ControlPath=${SSH_SOCKETS_DIR}/dock-%r@%h-%p`,
      "dock",
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;
  await cleanupSocket();

  console.log("SSH master connection stopped.");
}

async function cleanupSocket(): Promise<void> {
  const proc = spawn({
    cmd: ["sh", "-c", `rm -f ${SSH_SOCKETS_DIR}/dock-* 2>/dev/null`],
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}
