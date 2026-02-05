import { spawn } from "bun";
import { detectState } from "../../core/state";
import { terraformOutput } from "../../core/terraform";

export async function ssh(args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot SSH: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'rdev start' first."
          : "Run 'rdev create' first.")
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
