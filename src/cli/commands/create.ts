import { spawn } from "bun";
import { appendFileSync, existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadConfig } from "../../core/config";
import {
  terraformInit,
  terraformApply,
  terraformOutput,
} from "../../core/terraform";
import { detectState } from "../../core/state";
import { fetchKubeconfig, waitForKubeReady, waitForSsh } from "../../provisioning/kubeconfig";
import { setupAutoPilot, isAutoPilotEnabled } from "../../core/autopilot";
import { trackCommand } from "../../core/analytics";
import { findLatestSnapshot, findSnapshotByName, SnapshotMetadata } from "../../core/snapshot";

async function addToKnownHosts(ip: string): Promise<void> {
  const knownHostsPath = join(homedir(), ".ssh", "known_hosts");

  // Check if already in known_hosts
  if (existsSync(knownHostsPath)) {
    const content = readFileSync(knownHostsPath, "utf-8");
    if (content.includes(ip)) {
      return; // Already trusted
    }
  }

  // Fetch host key using ssh-keyscan
  const proc = spawn({
    cmd: ["ssh-keyscan", "-H", ip],
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode === 0 && output.trim()) {
    appendFileSync(knownHostsPath, output);
    console.log("Added SSH host key to known_hosts");
  }
}

async function resolveSnapshot(
  args: string[],
  config: { instanceType: string; zone: string }
): Promise<SnapshotMetadata | null> {
  const snapshotIndex = args.indexOf("--snapshot");
  if (snapshotIndex === -1) {
    return null;
  }

  const snapshotArg = args[snapshotIndex + 1];

  // If no argument or next arg is another flag, find latest matching
  if (!snapshotArg || snapshotArg.startsWith("-")) {
    const snapshot = await findLatestSnapshot(config.instanceType, config.zone);
    if (!snapshot) {
      throw new Error(
        `No snapshot found for instance type ${config.instanceType} in zone ${config.zone}.\n` +
          "Create one first with: dock snapshot --create"
      );
    }
    return snapshot;
  }

  // Specific snapshot name provided
  const snapshot = await findSnapshotByName(snapshotArg);
  if (!snapshot) {
    throw new Error(
      `Snapshot not found: ${snapshotArg}\n` +
        "List available snapshots with: dock snapshot --list"
    );
  }
  return snapshot;
}

export async function create(args: string[]): Promise<void> {
  const currentState = await detectState();

  if (currentState.state === "running") {
    console.log("Environment already running.");
    console.log(`IP: ${currentState.details?.ip}`);
    console.log(`SSH: ${currentState.details?.sshCommand}`);
    return;
  }

  if (currentState.state === "stopped") {
    console.log(
      "Environment exists but is stopped. Use 'dock start' to power on."
    );
    return;
  }

  const config = loadConfig();
  const snapshot = await resolveSnapshot(args, config);
  const fromSnapshot = snapshot !== null;

  await trackCommand("create", async () => {
    if (fromSnapshot) {
      console.log("\uD83D\uDE80 Launching from snapshot: provisioning skipped.\n");
      console.log(`Snapshot: ${snapshot.name}`);
      console.log(`Image ID: ${snapshot.imageId}\n`);
    } else {
      console.log("Creating remote development environment...\n");
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
        instance_image: config.instanceImage,
        instance_name: config.instanceName,
        kubernetes_engine: config.kubernetesEngine,
        use_reserved_ip: config.useReservedIp,
        snapshot_image_id: snapshot?.imageId ?? "",
        skip_provisioning: fromSnapshot,
      },
    });

    const outputs = await terraformOutput();
    if (!outputs) {
      throw new Error("Failed to read Terraform outputs");
    }

    if (fromSnapshot) {
      // Just wait for SSH when booting from snapshot (already provisioned)
      console.log("\nWaiting for instance to be ready...");
      await waitForSsh(outputs.public_ip, config.sshPrivateKeyPath);
    } else {
      console.log("\nWaiting for provisioning to complete...");
      await waitForKubeReady(outputs.public_ip, config.sshPrivateKeyPath);
    }

    // Add host key to known_hosts so Docker over SSH works immediately
    await addToKnownHosts(outputs.public_ip);

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
    if (fromSnapshot) {
      console.log(`Snapshot:   ${snapshot.name}`);
    }

    // Auto-pilot setup
    if (isAutoPilotEnabled()) {
      console.log("----------------------------------------");
      console.log("Setting up auto-pilot mode...");
      await setupAutoPilot(outputs.public_ip, kubeconfigPath);
    } else {
      console.log(`Docker:     export DOCKER_HOST=${outputs.docker_host}`);
      console.log(`Kubeconfig: export KUBECONFIG=${kubeconfigPath}`);
      console.log("----------------------------------------");
    }
  });
}
