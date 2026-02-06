import { detectState } from "../../core/state";
import { shutdown } from "../../core/scw";

export async function stop(_args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state === "absent") {
    console.log("No environment exists. Nothing to stop.");
    return;
  }

  if (state.state === "stopped") {
    console.log("Environment is already stopped.");
    return;
  }

  if (state.state !== "running") {
    console.log(`Cannot stop: environment is ${state.state}`);
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

  await shutdown(instanceUuid, zone);

  console.log("\n----------------------------------------");
  console.log("Environment stopped.");
  console.log("Data is preserved. Run 'dock start' to resume.");
  console.log("Run 'dock destroy' to delete everything.");
  console.log("----------------------------------------");
}
