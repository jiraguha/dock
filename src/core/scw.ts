import { spawn } from "bun";

export async function runScw(args: string[]): Promise<string> {
  // Pass Scaleway credentials via environment variables
  const projectId = process.env["SCW_PROJECT_ID"];
  const env = {
    ...process.env,
    SCW_ACCESS_KEY: process.env["SCW_ACCESS_KEY"],
    SCW_SECRET_KEY: process.env["SCW_SECRET_KEY"],
    SCW_DEFAULT_PROJECT_ID: projectId,
    SCW_DEFAULT_ORGANIZATION_ID: process.env["SCW_ORGANIZATION_ID"] ?? projectId,
  };

  const proc = spawn({
    cmd: ["scw", ...args],
    stdout: "pipe",
    stderr: "pipe",
    env,
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
  // Try public_ips array first (new API), then fall back to public_ip (old API)
  return data.public_ips?.[0]?.address ?? data.public_ip?.address ?? "";
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
