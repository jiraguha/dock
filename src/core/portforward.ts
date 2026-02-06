import { spawn, type Subprocess } from "bun";

export interface PortForwardOptions {
  ip: string;
  sshKeyPath: string;
  ports: number[];
  user?: string;
}

export interface PortForwardSession {
  process: Subprocess;
  ports: number[];
  stop: () => void;
}

export async function startPortForward(
  options: PortForwardOptions
): Promise<PortForwardSession> {
  const { ip, sshKeyPath, ports, user = "root" } = options;

  if (ports.length === 0) {
    throw new Error("No ports specified for forwarding");
  }

  // Build SSH command with all port forwards
  // ssh -N -L 8080:localhost:8080 -L 3000:localhost:3000 ... user@ip
  const sshArgs = [
    "-N", // No command execution
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=/dev/null",
    "-o",
    "ServerAliveInterval=60",
    "-o",
    "ServerAliveCountMax=3",
    "-i",
    sshKeyPath,
  ];

  // Add each port forward
  for (const port of ports) {
    sshArgs.push("-L", `${port}:localhost:${port}`);
  }

  sshArgs.push(`${user}@${ip}`);

  const proc = spawn({
    cmd: ["ssh", ...sshArgs],
    stdout: "pipe",
    stderr: "pipe",
  });

  // Give SSH a moment to establish connection
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check if process is still running
  if (proc.exitCode !== null) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`SSH tunnel failed to start: ${stderr}`);
  }

  return {
    process: proc,
    ports,
    stop: () => {
      proc.kill();
    },
  };
}

export function formatPortForwardCommand(options: PortForwardOptions): string {
  const { ip, sshKeyPath, ports, user = "root" } = options;

  const portArgs = ports.map((p) => `-L ${p}:localhost:${p}`).join(" ");

  return `ssh -N ${portArgs} -i ${sshKeyPath} ${user}@${ip}`;
}
