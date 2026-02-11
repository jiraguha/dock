import { detectState } from "../../core/state";

export async function dockerEnv(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock docker-env");
    console.log("");
    console.log("Print DOCKER_HOST export command for the remote environment.");
    console.log("");
    console.log("Use with eval to set the environment variable:");
    console.log("  eval $(dock docker-env)");
    console.log("");
    console.log("This enables SSH-per-command Docker usage. For heavy use");
    console.log("(many containers), prefer 'dock docker-tunnel' instead.");
    return;
  }

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
