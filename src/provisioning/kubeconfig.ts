import { spawn } from "bun";
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const KUBECONFIG_PATH = join(homedir(), ".kube", "rdev-config");

export async function fetchKubeconfig(
  ip: string,
  sshKeyPath: string
): Promise<string> {
  // Ensure .kube directory exists
  const kubeDir = join(homedir(), ".kube");
  if (!existsSync(kubeDir)) {
    mkdirSync(kubeDir, { recursive: true });
  }

  console.log("Fetching kubeconfig from remote...");

  // SCP the kubeconfig from remote
  const proc = spawn({
    cmd: [
      "scp",
      "-i",
      sshKeyPath,
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "LogLevel=ERROR",
      `root@${ip}:/root/.kube/config`,
      KUBECONFIG_PATH,
    ],
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to fetch kubeconfig: ${stderr}`);
  }

  // Read and rewrite server address
  const configFile = Bun.file(KUBECONFIG_PATH);
  let config = await configFile.text();

  // Replace localhost/127.0.0.1 with public IP
  config = config.replace(
    /server:\s*https:\/\/(localhost|127\.0\.0\.1):/g,
    `server: https://${ip}:`
  );

  await Bun.write(KUBECONFIG_PATH, config);

  console.log(`Kubeconfig saved to: ${KUBECONFIG_PATH}`);
  return KUBECONFIG_PATH;
}

export function getKubeconfigPath(): string {
  return KUBECONFIG_PATH;
}

export async function waitForKubeReady(
  ip: string,
  sshKeyPath: string,
  maxAttempts = 30,
  intervalMs = 10000
): Promise<void> {
  console.log("Waiting for Kubernetes to be ready...");

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const proc = spawn({
        cmd: [
          "ssh",
          "-i",
          sshKeyPath,
          "-o",
          "StrictHostKeyChecking=accept-new",
          "-o",
          "UserKnownHostsFile=/dev/null",
          "-o",
          "LogLevel=ERROR",
          "-o",
          "ConnectTimeout=5",
          `root@${ip}`,
          "test -f /var/run/rdev-provisioned && kubectl get nodes",
        ],
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      if (exitCode === 0) {
        console.log("Kubernetes is ready.");
        return;
      }
    } catch {
      // Ignore errors, keep trying
    }

    if (i < maxAttempts - 1) {
      process.stdout.write(".");
      await Bun.sleep(intervalMs);
    }
  }

  throw new Error("Timeout waiting for Kubernetes to be ready");
}
