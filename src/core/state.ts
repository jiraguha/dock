import {
  terraformOutput,
  terraformStateExists,
} from "./terraform";
import { getDropletStatus, getDropletIp } from "./doctl";
import type { EnvironmentState, StateType } from "../types";

export async function detectState(): Promise<EnvironmentState> {
  const stateExists = await terraformStateExists();

  if (!stateExists) {
    return { state: "absent", details: null };
  }

  const outputs = await terraformOutput();

  if (!outputs || !outputs.droplet_id) {
    return { state: "absent", details: null };
  }

  // Query DigitalOcean for actual droplet status
  try {
    const status = await getDropletStatus(outputs.droplet_id);
    const state = mapDropletStatus(status);

    if (state === "running") {
      // Get current IP (may have changed after power cycle)
      const currentIp = await getDropletIp(outputs.droplet_id);
      return {
        state: "running",
        details: {
          ip: currentIp,
          dropletId: outputs.droplet_id,
          sshCommand: `ssh -i ${outputs.ssh_key_path} root@${currentIp}`,
          dockerHost: `ssh://root@${currentIp}`,
        },
      };
    }

    if (state === "stopped") {
      return {
        state: "stopped",
        details: { dropletId: outputs.droplet_id },
      };
    }

    if (state === "provisioning") {
      return {
        state: "provisioning",
        details: { dropletId: outputs.droplet_id },
      };
    }

    return { state, details: null };
  } catch {
    // Droplet may have been deleted outside Terraform
    return { state: "destroyed", details: null };
  }
}

function mapDropletStatus(status: string): StateType {
  switch (status) {
    case "active":
      return "running";
    case "off":
      return "stopped";
    case "new":
      return "provisioning";
    case "archive":
      return "destroyed";
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
      return `Environment is provisioning (droplet ID: ${details?.dropletId})`;
    case "running":
      return [
        "Environment is running",
        `  IP: ${details?.ip}`,
        `  SSH: ${details?.sshCommand}`,
        `  Docker: export DOCKER_HOST=${details?.dockerHost}`,
      ].join("\n");
    case "stopped":
      return `Environment is stopped (droplet ID: ${details?.dropletId}). Run 'rdev start' to power on.`;
    case "destroyed":
      return "Environment was destroyed externally. Run 'rdev destroy' to clean up state, then 'rdev create' to recreate.";
    default:
      return `Unknown state: ${state}`;
  }
}
