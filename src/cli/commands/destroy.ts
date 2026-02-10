import { spawn } from "bun";
import { loadConfig } from "../../core/config";
import { terraformDestroy, terraformOutput, terraformStateExists } from "../../core/terraform";
import { cleanupAutoPilot, setState, isAutoPilotEnabled, removeDockInit } from "../../core/autopilot";
import { trackCommand } from "../../core/analytics";

async function removeKnownHost(ip: string): Promise<void> {
  try {
    const proc = spawn({
      cmd: ["ssh-keygen", "-R", ip],
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    console.log(`Removed SSH known host entry for ${ip}`);
  } catch {
    // Ignore errors - host may not be in known_hosts
  }
}

export async function destroy(_args: string[]): Promise<void> {
  const stateExists = await terraformStateExists();

  if (!stateExists) {
    console.log("No environment exists. Nothing to destroy.");
    return;
  }

  // Get IP before destroying so we can clean up known_hosts
  const outputs = await terraformOutput();
  const instanceIp = outputs?.public_ip;

  await trackCommand("destroy", async () => {
    // Cleanup auto-pilot connections before destroy
    if (isAutoPilotEnabled()) {
      await cleanupAutoPilot();
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
        instance_image: config.instanceImage,
        instance_name: config.instanceName,
        kubernetes_engine: config.kubernetesEngine,
        use_reserved_ip: config.useReservedIp,
      },
    });

    // Clean up SSH known_hosts entry
    if (instanceIp) {
      await removeKnownHost(instanceIp);
    }

    // Update auto-pilot state
    setState("absent");
    removeDockInit();

    console.log("\n----------------------------------------");
    console.log("Environment destroyed. Zero resources remaining.");
    console.log("----------------------------------------");
  });
}
