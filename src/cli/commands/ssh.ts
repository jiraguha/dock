import { spawn } from "bun";
import { detectState } from "../../core/state";
import { terraformOutput } from "../../core/terraform";

export async function ssh(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock ssh [command]");
    console.log("");
    console.log("Open SSH connection to the remote environment.");
    console.log("");
    console.log("Arguments:");
    console.log("  command    Optional command to run on remote (instead of shell)");
    console.log("");
    console.log("Examples:");
    console.log("  dock ssh              # Open interactive shell");
    console.log("  dock ssh ls -la       # Run command and exit");
    console.log("  dock ssh 'cat /etc/os-release'");
    return;
  }

  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot SSH: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'dock start' first."
          : "Run 'dock create' first.")
    );
  }

  const outputs = await terraformOutput();
  if (!outputs) {
    throw new Error("Could not read Terraform outputs");
  }

  const ip = state.details?.ip ?? outputs.public_ip;

  const sshArgs = [
    "-i",
    outputs.ssh_key_path,
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "LogLevel=ERROR",
    `root@${ip}`,
    ...args, // Pass through any additional SSH arguments/commands
  ];

  const proc = spawn({
    cmd: ["ssh", ...sshArgs],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}
