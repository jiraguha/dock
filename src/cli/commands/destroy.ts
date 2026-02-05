import { loadConfig } from "../../core/config";
import { terraformDestroy, terraformStateExists } from "../../core/terraform";

export async function destroy(_args: string[]): Promise<void> {
  const stateExists = await terraformStateExists();

  if (!stateExists) {
    console.log("No environment exists. Nothing to destroy.");
    return;
  }

  console.log("Destroying remote development environment...\n");
  console.log("This will delete:");
  console.log("  - Instance and all data");
  console.log("  - SSH key");
  console.log("  - Security group");
  console.log("  - Flexible IP (if any)");
  console.log("");

  const config = loadConfig();

  await terraformDestroy({
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

  console.log("\n----------------------------------------");
  console.log("Environment destroyed. Zero resources remaining.");
  console.log("----------------------------------------");
}
