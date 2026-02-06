import { spawn, type Subprocess } from "bun";
import { homedir } from "os";
import { join } from "path";

const DOCK_DIR = join(homedir(), ".dock");
const PID_FILE = join(DOCK_DIR, "portforward.pid");

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

  // Build SSH command with all port forwards - NO ControlMaster
  const sshArgs = [
    "-N", // No command execution
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ServerAliveInterval=60",
    "-o", "ServerAliveCountMax=3",
    "-o", "ExitOnForwardFailure=yes",
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

  // Give SSH a moment to establish connection
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Check if process failed immediately
  if (proc.exitCode !== null && proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`SSH tunnel failed to start: ${stderr}`);
  }

  const pid = proc.pid;

  // Save session info
  await savePid(pid, ports, ip);

  if (background) {
    // In background mode, detach the process
    proc.unref();
  }

  return {
    process: proc,
    ports,
    pid,
    stop: async () => {
      await stopByPid(pid);
    },
  };
}

async function stopByPid(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already be gone
  }
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
  startedAt: string;
}

async function savePid(
  pid: number,
  ports: number[],
  ip: string
): Promise<void> {
  const info: PidInfo = {
    pid,
    ports,
    ip,
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

function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function getRunningTunnel(): Promise<PidInfo | null> {
  try {
    if (!(await fileExists(PID_FILE))) {
      return null;
    }

    const pidFile = Bun.file(PID_FILE);
    const content = await pidFile.text();
    const info = JSON.parse(content) as PidInfo;

    // Check if process is actually running
    if (!isProcessRunning(info.pid)) {
      // Stale PID file, clean up
      await removePidFile();
      return null;
    }

    return info;
  } catch {
    return null;
  }
}

export async function stopRunningTunnel(): Promise<boolean> {
  const info = await getRunningTunnel();

  if (!info) {
    return false;
  }

  // Kill by PID
  try {
    process.kill(info.pid, "SIGTERM");

    // Wait a moment for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Force kill if still running
    if (isProcessRunning(info.pid)) {
      process.kill(info.pid, "SIGKILL");
    }
  } catch {
    // Process may already be gone
  }

  await removePidFile();
  return true;
}

export async function checkTunnelHealth(): Promise<boolean> {
  const info = await getRunningTunnel();
  return info !== null;
}
