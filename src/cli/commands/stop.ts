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

  await shutdown(instanceId, zone);

  console.log("\n----------------------------------------");
  console.log("Environment stopped.");
  console.log("Data is preserved. Run 'rdev start' to resume.");
  console.log("Run 'rdev destroy' to delete everything.");
  console.log("----------------------------------------");
}
