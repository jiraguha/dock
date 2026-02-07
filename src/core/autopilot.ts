import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { spawn } from "bun";
import { DOCK_HOME } from "./config";

const DOCK_INIT_PATH = join(DOCK_HOME, "dock.init");
const DOCK_STATE_PATH = join(DOCK_HOME, "state");
const SHELL_INTEGRATION_MARKER = "# dock auto-pilot integration";

export type DockState = "up" | "down" | "absent";

/**
 * Check if auto-pilot mode is enabled (default: true)
 */
export function isAutoPilotEnabled(): boolean {
  const value = process.env["AUTO_PILOT"];
  if (value === undefined) return true; // Default enabled
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get current dock state
 */
export function getState(): DockState {
  if (!existsSync(DOCK_STATE_PATH)) return "absent";
  const state = readFileSync(DOCK_STATE_PATH, "utf-8").trim();
  if (state === "up" || state === "down" || state === "absent") {
    return state;
  }
  return "absent";
}

/**
 * Set dock state
 */
export function setState(state: DockState): void {
  if (!existsSync(DOCK_HOME)) {
    mkdirSync(DOCK_HOME, { recursive: true });
  }
  writeFileSync(DOCK_STATE_PATH, state);
}

/**
 * Generate dock.init script with current environment settings
 */
export function generateDockInit(ip: string, kubeConfigPath: string): void {
  const initScript = `#!/bin/bash
# Dock auto-pilot initialization script
# Generated automatically - do not edit manually

# Only configure if dock environment is up
if [ -f "${DOCK_STATE_PATH}" ] && [ "$(cat ${DOCK_STATE_PATH})" = "up" ]; then
  # Set up SSH multiplexing (if not already configured)
  if ! grep -q "Host dock" ~/.ssh/config 2>/dev/null; then
    dock ssh-config 2>/dev/null
  fi

  # Export Docker host using SSH multiplexing
  export DOCKER_HOST=ssh://dock

  # Export Kubernetes config
  export KUBECONFIG="${kubeConfigPath}"

  # Optional: Show indicator that dock is active
  # export PS1="[dock] $PS1"
fi
`;

  writeFileSync(DOCK_INIT_PATH, initScript, { mode: 0o755 });
}

/**
 * Remove dock.init script
 */
export function removeDockInit(): void {
  if (existsSync(DOCK_INIT_PATH)) {
    try {
      const { unlinkSync } = require("fs");
      unlinkSync(DOCK_INIT_PATH);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get the shell config file path for the current shell
 */
function getShellConfigPath(): string {
  const shell = process.env["SHELL"] || "";
  const home = homedir();

  if (shell.includes("zsh")) {
    const zshrc = join(home, ".zshrc");
    if (existsSync(zshrc)) return zshrc;
    return join(home, ".zprofile");
  } else if (shell.includes("fish")) {
    return join(home, ".config", "fish", "config.fish");
  }
  // Default to bash
  const bashrc = join(home, ".bashrc");
  if (existsSync(bashrc)) return bashrc;
  return join(home, ".bash_profile");
}

/**
 * Check if shell integration is already installed
 */
function isShellIntegrationInstalled(): boolean {
  const configPath = getShellConfigPath();
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");
  return content.includes(SHELL_INTEGRATION_MARKER) || content.includes("dock.init");
}

/**
 * Install shell integration to auto-source dock.init
 */
export function installShellIntegration(): boolean {
  if (isShellIntegrationInstalled()) {
    return false; // Already installed
  }

  const configPath = getShellConfigPath();
  const shell = process.env["SHELL"] || "";

  let integrationCode: string;

  if (shell.includes("fish")) {
    integrationCode = `
${SHELL_INTEGRATION_MARKER}
if test -f ~/.dock/dock.init
  source ~/.dock/dock.init
end
`;
  } else {
    integrationCode = `
${SHELL_INTEGRATION_MARKER}
[ -f ~/.dock/dock.init ] && source ~/.dock/dock.init
`;
  }

  appendFileSync(configPath, integrationCode);
  return true;
}

/**
 * Run auto-pilot setup after create/start
 */
export async function setupAutoPilot(ip: string, kubeConfigPath: string): Promise<void> {
  if (!isAutoPilotEnabled()) {
    return;
  }

  // Update state
  setState("up");

  // Generate dock.init
  generateDockInit(ip, kubeConfigPath);

  // Install shell integration (first time only)
  const installed = installShellIntegration();
  if (installed) {
    const configPath = getShellConfigPath();
    console.log(`Added auto-pilot integration to ${configPath}`);
  }

  // Run ssh-config to set up SSH multiplexing
  console.log("Setting up SSH multiplexing...");
  const sshConfigProc = spawn({
    cmd: ["dock", "ssh-config"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await sshConfigProc.exited;

  // Start port forwarding in background
  console.log("Starting port forwarding...");
  const portforwardProc = spawn({
    cmd: ["dock", "portforward", "-d"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await portforwardProc.exited;

  console.log("");
  console.log("Auto-pilot configured:");
  console.log("  DOCKER_HOST=ssh://dock");
  console.log(`  KUBECONFIG=${kubeConfigPath}`);
  console.log("");
  console.log("To apply in current shell, run:");
  console.log("  source ~/.dock/dock.init");
}

/**
 * Cleanup auto-pilot before stop/destroy
 */
export async function cleanupAutoPilot(): Promise<void> {
  if (!isAutoPilotEnabled()) {
    return;
  }

  console.log("Cleaning up auto-pilot...");

  // Stop port forwarding
  const portforwardProc = spawn({
    cmd: ["dock", "portforward", "--stop"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await portforwardProc.exited;

  // Stop SSH master connection
  const sshConfigProc = spawn({
    cmd: ["dock", "ssh-config", "--stop-master"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await sshConfigProc.exited;

  // Update state
  setState("down");
}

/**
 * Refresh all connections (used when session breaks)
 */
export async function refreshConnections(): Promise<void> {
  console.log("Refreshing connections...");

  // Stop existing connections
  await cleanupAutoPilot();

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get current IP from terraform
  const { terraformOutput } = await import("./terraform");
  const outputs = await terraformOutput();
  if (!outputs) {
    throw new Error("Could not read Terraform outputs");
  }

  const ip = outputs.public_ip;
  const kubeConfigPath = join(homedir(), ".kube", "dock-config");

  // Re-setup
  setState("up");
  await setupAutoPilot(ip, kubeConfigPath);

  console.log("Connections refreshed.");
}

/**
 * Clean all connections (full disconnect)
 */
export async function cleanConnections(): Promise<void> {
  console.log("Cleaning all connections...");

  // Stop port forwarding
  const portforwardProc = spawn({
    cmd: ["dock", "portforward", "--stop"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await portforwardProc.exited;

  // Stop SSH master
  const sshConfigProc = spawn({
    cmd: ["dock", "ssh-config", "--stop-master"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await sshConfigProc.exited;

  // Stop docker tunnel if running
  const dockerTunnelProc = spawn({
    cmd: ["dock", "docker-tunnel", "--stop"],
    stdout: "pipe",
    stderr: "pipe",
  });
  await dockerTunnelProc.exited;

  // Update state but don't remove dock.init
  setState("down");

  console.log("All connections cleaned.");
  console.log("Environment is still available. Run 'dock start' to reconnect.");
}
