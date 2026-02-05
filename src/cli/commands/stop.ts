import { detectState } from "../../core/state";
import { shutdown } from "../../core/doctl";

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

  const dropletId = state.details?.dropletId;
  if (!dropletId) {
    throw new Error("Could not determine droplet ID");
  }

  await shutdown(dropletId);

  console.log("\n----------------------------------------");
  console.log("Environment stopped.");
  console.log("Data is preserved. Run 'rdev start' to resume.");
  console.log("Run 'rdev destroy' to delete everything.");
  console.log("----------------------------------------");
}
