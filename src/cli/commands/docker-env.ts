import { detectState } from "../../core/state";

export async function dockerEnv(_args: string[]): Promise<void> {
  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot get docker env: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'dock start' first."
          : "Run 'dock create' first.")
    );
  }

  const dockerHost = state.details?.dockerHost;
  if (!dockerHost) {
    throw new Error("Could not determine Docker host");
  }

  // Output in a format that can be eval'd
  console.log(`export DOCKER_HOST=${dockerHost}`);
}
