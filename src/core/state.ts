import { terraformOutput, terraformStateExists } from "./terraform";
import { getInstanceState, getInstanceIp } from "./scw";
import type { EnvironmentState, StateType } from "../types";

export async function detectState(): Promise<EnvironmentState> {
  const stateExists = await terraformStateExists();

  if (!stateExists) {
    return { state: "absent", details: null };
  }

  const outputs = await terraformOutput();

  if (!outputs || !outputs.instance_id) {
    return { state: "absent", details: null };
  }

  // Query Scaleway for actual instance status
  try {
    const status = await getInstanceState(outputs.instance_id, outputs.zone);
    const state = mapInstanceState(status);

    if (state === "running") {
      // Get current IP (may have changed after power cycle)
      const currentIp = await getInstanceIp(outputs.instance_id, outputs.zone);
      return {
        state: "running",
        details: {
          ip: currentIp,
          instanceId: outputs.instance_id,
          zone: outputs.zone,
          sshCommand: `ssh -i ${outputs.ssh_key_path} root@${currentIp}`,
          dockerHost: `ssh://root@${currentIp}`,
        },
      };
    }

    if (state === "stopped") {
      return {
        state: "stopped",
        details: { instanceId: outputs.instance_id, zone: outputs.zone },
      };
    }

    if (state === "provisioning") {
      return {
        state: "provisioning",
        details: { instanceId: outputs.instance_id, zone: outputs.zone },
      };
    }

    return { state, details: null };
  } catch {
    // Instance may have been deleted outside Terraform
    return { state: "destroyed", details: null };
  }
}

function mapInstanceState(status: string): StateType {
  switch (status) {
    case "running":
      return "running";
    case "stopped":
    case "stopped in place":
      return "stopped";
    case "starting":
    case "stopping":
      return "provisioning";
    default:
      return "absent";
  }
}

export function formatState(envState: EnvironmentState): string {
  const { state, details } = envState;

  switch (state) {
    case "absent":
      return "No environment exists. Run 'rdev create' to create one.";
    case "provisioning":
      return `Environment is provisioning (instance ID: ${details?.instanceId})`;
    case "running":
      return [
        "Environment is running",
        `  IP: ${details?.ip}`,
        `  SSH: ${details?.sshCommand}`,
        `  Docker: export DOCKER_HOST=${details?.dockerHost}`,
      ].join("\n");
    case "stopped":
      return `Environment is stopped (instance ID: ${details?.instanceId}). Run 'rdev start' to power on.`;
    case "destroyed":
      return "Environment was destroyed externally. Run 'rdev destroy' to clean up state, then 'rdev create' to recreate.";
    default:
      return `Unknown state: ${state}`;
  }
}
