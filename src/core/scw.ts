import { spawn } from "bun";

export async function runScw(args: string[]): Promise<string> {
  const proc = spawn({
    cmd: ["scw", ...args],
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`scw failed: ${stderr}`);
  }

  return output;
}

export async function getInstanceState(
  instanceId: string,
  zone: string
): Promise<string> {
  const output = await runScw([
    "instance",
    "server",
    "get",
    instanceId,
    `zone=${zone}`,
    "-o",
    "json",
  ]);
  const data = JSON.parse(output);
  return data.state;
}

export async function getInstanceIp(
  instanceId: string,
  zone: string
): Promise<string> {
  const output = await runScw([
    "instance",
    "server",
    "get",
    instanceId,
    `zone=${zone}`,
    "-o",
    "json",
  ]);
  const data = JSON.parse(output);
  return data.public_ip?.address ?? "";
}

export async function powerOn(instanceId: string, zone: string): Promise<void> {
  console.log("Powering on instance...");
  await runScw([
    "instance",
    "server",
    "action",
    "poweron",
    instanceId,
    `zone=${zone}`,
    "--wait",
  ]);
  console.log("Instance powered on.");
}

export async function shutdown(
  instanceId: string,
  zone: string
): Promise<void> {
  console.log("Shutting down instance gracefully...");
  try {
    await runScw([
      "instance",
      "server",
      "action",
      "poweroff",
      instanceId,
      `zone=${zone}`,
      "--wait",
    ]);
    console.log("Instance shut down.");
  } catch {
    // Fall back to terminate if graceful shutdown fails
    console.log("Graceful shutdown failed, forcing power off...");
    await runScw([
      "instance",
      "server",
      "action",
      "terminate",
      instanceId,
      `zone=${zone}`,
      "--wait",
    ]);
    console.log("Instance terminated.");
  }
}
