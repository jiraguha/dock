import { detectState } from "../../core/state";
import { powerOn, getInstanceIp } from "../../core/scw";
import { terraformOutput } from "../../core/terraform";
import { loadConfig } from "../../core/config";
import { fetchKubeconfig, waitForSsh } from "../../provisioning/kubeconfig";
import { setupAutoPilot, isAutoPilotEnabled } from "../../core/autopilot";
import { join } from "path";
import { homedir } from "os";

export async function start(_args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state === "absent") {
    console.log("No environment exists. Run 'dock create' first.");
    return;
  }

  if (state.state === "running") {
    console.log("Environment is already running.");
    console.log(`IP: ${state.details?.ip}`);
    return;
  }

  if (state.state !== "stopped") {
    console.log(`Cannot start: environment is ${state.state}`);
    return;
  }

  const instanceId = state.details?.instanceId;
  const zone = state.details?.zone;
  if (!instanceId || !zone) {
    throw new Error("Could not determine instance ID or zone");
  }

  // Extract UUID from instance_id (format: zone/uuid)
  const instanceUuid = instanceId.includes("/")
    ? (instanceId.split("/")[1] ?? instanceId)
    : instanceId;

  await powerOn(instanceUuid, zone);

  // Get the new IP (may have changed)
  const newIp = await getInstanceIp(instanceUuid, zone);
  const outputs = await terraformOutput();
  const config = loadConfig();

  // Wait for SSH to be available after power on
  await waitForSsh(newIp, config.sshPrivateKeyPath);

  console.log("\nUpdating kubeconfig with new IP...");
  await fetchKubeconfig(newIp, config.sshPrivateKeyPath);

  console.log("\n----------------------------------------");
  console.log("Environment started!");
  console.log("----------------------------------------");
  console.log(`IP:     ${newIp}`);
  console.log(`SSH:    ssh -i ${outputs?.ssh_key_path} root@${newIp}`);

  // Auto-pilot setup
  if (isAutoPilotEnabled()) {
    console.log("----------------------------------------");
    console.log("Setting up auto-pilot mode...");
    const kubeconfigPath = join(homedir(), ".kube", "dock-config");
    await setupAutoPilot(newIp, kubeconfigPath);
  } else {
    console.log(`Docker: export DOCKER_HOST=ssh://root@${newIp}`);
    console.log("----------------------------------------");
  }
}
