import { loadConfig } from "../../core/config";
import {
  terraformInit,
  terraformApply,
  terraformOutput,
} from "../../core/terraform";
import { detectState } from "../../core/state";
import { fetchKubeconfig, waitForKubeReady } from "../../provisioning/kubeconfig";

export async function create(_args: string[]): Promise<void> {
  console.log("Creating remote development environment...\n");

  const config = loadConfig();
  const currentState = await detectState();

  if (currentState.state === "running") {
    console.log("Environment already running.");
    console.log(`IP: ${currentState.details?.ip}`);
    console.log(`SSH: ${currentState.details?.sshCommand}`);
    return;
  }

  if (currentState.state === "stopped") {
    console.log(
      "Environment exists but is stopped. Use 'rdev start' to power on."
    );
    return;
  }

  console.log("Initializing Terraform...\n");
  await terraformInit();

  console.log("\nApplying infrastructure...\n");
  await terraformApply({
    autoApprove: true,
    vars: {
      scw_access_key: config.scwAccessKey,
      scw_secret_key: config.scwSecretKey,
      scw_project_id: config.scwProjectId,
      ssh_public_key_path: config.sshPublicKeyPath,
      ssh_private_key_path: config.sshPrivateKeyPath,
      region: config.region,
      zone: config.zone,
      instance_type: config.instanceType,
      instance_name: config.instanceName,
      kubernetes_engine: config.kubernetesEngine,
      use_reserved_ip: config.useReservedIp,
    },
  });

  const outputs = await terraformOutput();
  if (!outputs) {
    throw new Error("Failed to read Terraform outputs");
  }

  console.log("\nWaiting for provisioning to complete...");
  await waitForKubeReady(outputs.public_ip, config.sshPrivateKeyPath);

  console.log("\nFetching kubeconfig...");
  const kubeconfigPath = await fetchKubeconfig(
    outputs.public_ip,
    config.sshPrivateKeyPath
  );

  console.log("\n----------------------------------------");
  console.log("Environment ready!");
  console.log("----------------------------------------");
  console.log(`IP:         ${outputs.public_ip}`);
  console.log(`SSH:        ${outputs.ssh_command}`);
  console.log(`Docker:     export DOCKER_HOST=${outputs.docker_host}`);
  console.log(`Kubeconfig: export KUBECONFIG=${kubeconfigPath}`);
  console.log("----------------------------------------");
}
