import { detectState } from "../../core/state";
import { loadConfig } from "../../core/config";
import { fetchKubeconfig, getKubeconfigPath } from "../../provisioning/kubeconfig";

export async function kubeconfig(_args: string[]): Promise<void> {
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
