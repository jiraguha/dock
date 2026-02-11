import { spawn } from "bun";
import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";

export async function configure(args: string[]): Promise<void> {
  // Handle --help before state check
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock configure [options]");
    console.log("");
    console.log("Apply SSH server configuration to the remote instance.");
    console.log("");
    console.log("Options:");
    console.log("  --show, -s   Show current remote SSH configuration");
    console.log("  --help, -h   Show this help message");
    console.log("");
    console.log("Configuration values are set via environment variables:");
    console.log("  SSH_MAX_STARTUPS  MaxStartups setting (default: 100:30:200)");
    console.log("  SSH_MAX_SESSIONS  MaxSessions setting (default: 100)");
    return;
  }

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

  const config = loadConfig();
  const { maxStartups, maxSessions } = config.sshServerConfig;

  // Check for --show flag
  if (args.includes("--show") || args.includes("-s")) {
    await showRemoteConfig(ip, config.sshPrivateKeyPath);
    return;
  }

  console.log("Configuring remote SSH server...");
  console.log(`  MaxStartups: ${maxStartups}`);
  console.log(`  MaxSessions: ${maxSessions}`);
  console.log("");

  const commands = [
    `sed -i 's/^#*MaxStartups.*/MaxStartups ${maxStartups}/' /etc/ssh/sshd_config`,
    `sed -i 's/^#*MaxSessions.*/MaxSessions ${maxSessions}/' /etc/ssh/sshd_config`,
    // Add if not present
    `grep -q '^MaxStartups' /etc/ssh/sshd_config || echo 'MaxStartups ${maxStartups}' >> /etc/ssh/sshd_config`,
    `grep -q '^MaxSessions' /etc/ssh/sshd_config || echo 'MaxSessions ${maxSessions}' >> /etc/ssh/sshd_config`,
    `systemctl restart sshd`,
  ].join(" && ");

  const proc = spawn({
    cmd: [
      "ssh",
      "-i", config.sshPrivateKeyPath,
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      `root@${ip}`,
      commands,
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to configure SSH: ${stderr}`);
  }

  console.log("SSH server configured successfully.");
  console.log("");
  console.log("Current settings:");
  await showRemoteConfig(ip, config.sshPrivateKeyPath);
}

async function showRemoteConfig(ip: string, sshKeyPath: string): Promise<void> {
  const proc = spawn({
    cmd: [
      "ssh",
      "-i", sshKeyPath,
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      `root@${ip}`,
      "grep -E '^(MaxStartups|MaxSessions)' /etc/ssh/sshd_config || echo 'Using defaults'",
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();

  if (exitCode === 0) {
    console.log("Remote SSH config:");
    console.log(stdout.trim() || "  (using system defaults)");
  } else {
    console.log("Could not read remote SSH config");
  }
}
