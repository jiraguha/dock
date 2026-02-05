import { spawn } from "bun";

export async function runDoctl(args: string[]): Promise<string> {
  const proc = spawn({
    cmd: ["doctl", ...args],
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`doctl failed: ${stderr}`);
  }

  return output;
}

export async function getDropletStatus(dropletId: number): Promise<string> {
  const output = await runDoctl([
    "compute",
    "droplet",
    "get",
    String(dropletId),
    "--format",
    "Status",
    "--no-header",
  ]);
  return output.trim();
}

export async function getDropletIp(dropletId: number): Promise<string> {
  const output = await runDoctl([
    "compute",
    "droplet",
    "get",
    String(dropletId),
    "--format",
    "PublicIPv4",
    "--no-header",
  ]);
  return output.trim();
}

export async function powerOn(dropletId: number): Promise<void> {
  console.log("Powering on droplet...");
  await runDoctl([
    "compute",
    "droplet-action",
    "power-on",
    String(dropletId),
    "--wait",
  ]);
  console.log("Droplet powered on.");
}

export async function shutdown(dropletId: number): Promise<void> {
  console.log("Shutting down droplet gracefully...");
  try {
    await runDoctl([
      "compute",
      "droplet-action",
      "shutdown",
      String(dropletId),
      "--wait",
    ]);
    console.log("Droplet shut down.");
  } catch {
    // Fall back to power-off if graceful shutdown fails
    console.log("Graceful shutdown failed, forcing power off...");
    await runDoctl([
      "compute",
      "droplet-action",
      "power-off",
      String(dropletId),
      "--wait",
    ]);
    console.log("Droplet powered off.");
  }
}
