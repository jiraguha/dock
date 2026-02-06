import { spawn, type Subprocess } from "bun";
import { homedir } from "os";
import { join } from "path";

const DOCK_DIR = join(homedir(), ".dock");
const PID_FILE = join(DOCK_DIR, "portforward.pid");
const SOCKET_FILE = join(DOCK_DIR, "portforward.sock");

export interface PortForwardOptions {
  ip: string;
  sshKeyPath: string;
  ports: number[];
  user?: string;
  background?: boolean;
}

export interface PortForwardSession {
  process: Subprocess;
  ports: number[];
  pid: number;
  stop: () => Promise<void>;
}

async function ensureDockDir(): Promise<void> {
  const { mkdir } = await import("fs/promises");
  await mkdir(DOCK_DIR, { recursive: true });
}

export async function startPortForward(
  options: PortForwardOptions
): Promise<PortForwardSession> {
  const { ip, sshKeyPath, ports, user = "root", background = false } = options;

  if (ports.length === 0) {
    throw new Error("No ports specified for forwarding");
  }

  await ensureDockDir();

  // Build SSH command with all port forwards
  const sshArgs = [
    "-N", // No command execution
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ServerAliveInterval=60",
    "-o", "ServerAliveCountMax=3",
    "-o", "ExitOnForwardFailure=yes",
    "-o", `ControlPath=${SOCKET_FILE}`,
    "-o", "ControlMaster=yes",
    "-o", "ControlPersist=yes",
    "-i", sshKeyPath,
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

  // Give SSH a moment to establish connection and create control socket
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check if process failed immediately
  if (proc.exitCode !== null && proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`SSH tunnel failed to start: ${stderr}`);
  }

  const pid = proc.pid;

  // Save session info
  await savePid(pid, ports, ip, sshKeyPath, user);

  if (background) {
    // In background mode, we don't wait for the process
    // The ControlMaster keeps the connection alive
    proc.unref();
  }

  return {
    process: proc,
    ports,
    pid,
    stop: async () => {
      await stopViaControlSocket(ip, sshKeyPath, user);
    },
  };
}

async function stopViaControlSocket(
  ip: string,
  sshKeyPath: string,
  user: string
): Promise<void> {
  // Use control socket to gracefully close the connection
  const proc = spawn({
    cmd: [
      "ssh",
      "-o", `ControlPath=${SOCKET_FILE}`,
      "-O", "exit",
      "-i", sshKeyPath,
      `${user}@${ip}`,
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;
  await removePidFile();
}

export function formatPortForwardCommand(options: PortForwardOptions): string {
  const { ip, sshKeyPath, ports, user = "root", background = false } = options;

  const portArgs = ports.map((p) => `-L ${p}:localhost:${p}`).join(" ");
  const bgFlag = background ? "-f " : "";

  return `ssh -N ${bgFlag}${portArgs} -i ${sshKeyPath} ${user}@${ip}`;
}

interface PidInfo {
  pid: number;
  ports: number[];
  ip: string;
  sshKeyPath: string;
  user: string;
  startedAt: string;
}

async function savePid(
  pid: number,
  ports: number[],
  ip: string,
  sshKeyPath: string,
  user: string
): Promise<void> {
  const info: PidInfo = {
    pid,
    ports,
    ip,
    sshKeyPath,
    user,
    startedAt: new Date().toISOString(),
  };
  await Bun.write(PID_FILE, JSON.stringify(info, null, 2));
}

async function removePidFile(): Promise<void> {
  try {
    const { unlink } = await import("fs/promises");
    await unlink(PID_FILE);
  } catch {
    // Ignore if file doesn't exist
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const { stat } = await import("fs/promises");
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function getRunningTunnel(): Promise<PidInfo | null> {
  try {
    const socketExists = await fileExists(SOCKET_FILE);
    const pidExists = await fileExists(PID_FILE);

    if (!socketExists && !pidExists) {
      return null;
    }

    // If socket exists, tunnel is likely running
    if (socketExists) {
      // Try to read PID file for info
      if (pidExists) {
        const pidFile = Bun.file(PID_FILE);
        const content = await pidFile.text();
        return JSON.parse(content) as PidInfo;
      }

      // Socket exists but no PID file - tunnel is running but we don't have full info
      // Try to get PID from ssh control check
      const proc = spawn({
        cmd: ["ssh", "-o", `ControlPath=${SOCKET_FILE}`, "-O", "check", "dummy"],
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      const stderr = await new Response(proc.stderr).text();
      const pidMatch = stderr.match(/pid=(\d+)/);
      const pid = pidMatch?.[1] ? parseInt(pidMatch[1], 10) : 0;

      return {
        pid,
        ports: [],
        ip: "",
        sshKeyPath: "",
        user: "root",
        startedAt: "",
      };
    }

    // PID file exists but socket doesn't - stale state
    if (pidExists) {
      await removePidFile();
    }

    return null;
  } catch {
    return null;
  }
}

export async function stopRunningTunnel(): Promise<boolean> {
  const info = await getRunningTunnel();

  // Try to stop via control socket
  try {
    if (await fileExists(SOCKET_FILE)) {
      const proc = spawn({
        cmd: [
          "ssh",
          "-o", `ControlPath=${SOCKET_FILE}`,
          "-O", "exit",
          `${info?.ip || "dummy"}`,
        ],
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
    }
  } catch {
    // Ignore errors
  }

  // Also try to kill by PID if we have it
  if (info?.pid) {
    try {
      process.kill(info.pid, "SIGTERM");
    } catch {
      // Process may already be gone
    }
  }

  await removePidFile();

  // Clean up socket file
  try {
    const { unlink } = await import("fs/promises");
    await unlink(SOCKET_FILE);
  } catch {
    // Ignore
  }

  return true;
}

export async function checkTunnelHealth(): Promise<boolean> {
  try {
    if (!(await fileExists(SOCKET_FILE))) {
      return false;
    }

    // Use control socket to check status
    const proc = spawn({
      cmd: [
        "ssh",
        "-o", `ControlPath=${SOCKET_FILE}`,
        "-O", "check",
        "dummy",
      ],
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
