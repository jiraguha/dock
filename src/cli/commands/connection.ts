import { refreshConnections, cleanConnections, getState } from "../../core/autopilot";
import { detectState } from "../../core/state";

export async function connection(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock connection [options]");
    console.log("");
    console.log("Manage dock connections (SSH, port forwarding, Docker tunnel).");
    console.log("");
    console.log("Options:");
    console.log("  --status     Show connection status (default)");
    console.log("  --refresh    Restart all connections");
    console.log("  --clean      Stop all connections");
    console.log("  --help, -h   Show this help");
    return;
  }

  const refreshFlag = args.includes("--refresh");
  const cleanFlag = args.includes("--clean");
  const statusFlag = args.includes("--status") || args.length === 0;

  if (statusFlag && !refreshFlag && !cleanFlag) {
    await showStatus();
    return;
  }

  if (refreshFlag) {
    const state = await detectState();
    if (state.state !== "running") {
      throw new Error(
        `Cannot refresh: environment is ${state.state}. ` +
          (state.state === "stopped"
            ? "Run 'dock start' first."
            : "Run 'dock create' first.")
      );
    }
    await refreshConnections();
    return;
  }

  if (cleanFlag) {
    await cleanConnections();
    return;
  }
}

async function showStatus(): Promise<void> {
  const infraState = await detectState();
  const autoPilotState = getState();

  console.log("Connection Status");
  console.log("=================");
  console.log(`Infrastructure: ${infraState.state}`);
  console.log(`Auto-pilot state: ${autoPilotState}`);

  if (infraState.state === "running" && infraState.details?.ip) {
    console.log(`Remote IP: ${infraState.details.ip}`);
  }

  console.log("");

  // Check SSH master
  const { spawn } = await import("bun");
  const sshProc = spawn({
    cmd: ["sh", "-c", "ls ~/.ssh/sockets/dock-* 2>/dev/null | head -1"],
    stdout: "pipe",
    stderr: "pipe",
  });
  const sshOutput = await new Response(sshProc.stdout).text();
  await sshProc.exited;

  if (sshOutput.trim()) {
    console.log("SSH master: active");
  } else {
    console.log("SSH master: not active");
  }

  // Check port forwarding
  const pfProc = spawn({
    cmd: ["sh", "-c", "cat ~/.dock/portforward.pid 2>/dev/null"],
    stdout: "pipe",
    stderr: "pipe",
  });
  const pfPid = await new Response(pfProc.stdout).text();
  await pfProc.exited;

  if (pfPid.trim()) {
    try {
      process.kill(parseInt(pfPid.trim()), 0);
      console.log("Port forwarding: active");
    } catch {
      console.log("Port forwarding: not active");
    }
  } else {
    console.log("Port forwarding: not active");
  }

  // Check docker tunnel
  const dtProc = spawn({
    cmd: ["sh", "-c", "cat ~/.dock/docker-tunnel.pid 2>/dev/null"],
    stdout: "pipe",
    stderr: "pipe",
  });
  const dtPid = await new Response(dtProc.stdout).text();
  await dtProc.exited;

  if (dtPid.trim()) {
    try {
      process.kill(parseInt(dtPid.trim()), 0);
      console.log("Docker tunnel: active");
    } catch {
      console.log("Docker tunnel: not active");
    }
  } else {
    console.log("Docker tunnel: not active");
  }

  console.log("");
  console.log("Commands:");
  console.log("  dock connection --refresh  # Restart all connections");
  console.log("  dock connection --clean    # Stop all connections");
}
