import { detectState } from "../../core/state";
import { powerOn, getInstanceIp } from "../../core/scw";
import { terraformOutput } from "../../core/terraform";
import { loadConfig } from "../../core/config";
import { fetchKubeconfig } from "../../provisioning/kubeconfig";

export async function start(_args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state === "absent") {
    console.log("No environment exists. Run 'rdev create' first.");
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

  await powerOn(instanceId, zone);

  // Get the new IP (may have changed)
  const newIp = await getInstanceIp(instanceId, zone);
  const outputs = await terraformOutput();
  const config = loadConfig();

  console.log("\nUpdating kubeconfig with new IP...");
  await fetchKubeconfig(newIp, config.sshPrivateKeyPath);

  console.log("\n----------------------------------------");
  console.log("Environment started!");
  console.log("----------------------------------------");
  console.log(`IP:     ${newIp}`);
  console.log(`SSH:    ssh -i ${outputs?.ssh_key_path} root@${newIp}`);
  console.log(`Docker: export DOCKER_HOST=ssh://root@${newIp}`);
  console.log("----------------------------------------");
}
