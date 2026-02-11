import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";
import { fetchKubeconfig, getKubeconfigPath } from "../../provisioning/kubeconfig";

export async function kubeconfig(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: dock kubeconfig");
    console.log("");
    console.log("Fetch kubeconfig from the remote environment.");
    console.log("");
    console.log("Downloads the Kubernetes config file and updates the server");
    console.log("address to point to the remote instance's public IP.");
    console.log("");
    console.log("Output:");
    console.log("  Saves to: ~/.kube/dock-config");
    return;
  }

  const state = await detectState();

  if (state.state !== "running") {
    throw new Error(
      `Cannot fetch kubeconfig: environment is ${state.state}. ` +
        (state.state === "stopped"
          ? "Run 'dock start' first."
          : "Run 'dock create' first.")
    );
  }

  const ip = state.details?.ip;
  if (!ip) {
    throw new Error("Could not determine environment IP");
  }

  const config = loadConfig();
  const path = await fetchKubeconfig(ip, config.sshPrivateKeyPath);

  console.log("\nTo use kubectl with this environment:");
  console.log(`  export KUBECONFIG=${path}`);
  console.log("\nOr run kubectl directly:");
  console.log(`  KUBECONFIG=${path} kubectl get nodes`);
}
