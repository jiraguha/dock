import { homedir } from "os";
import { join } from "path";
import type { Config } from "../types";

const DEFAULT_CONFIG: Omit<Config, "doToken"> = {
  sshPublicKeyPath: join(homedir(), ".ssh", "id_ed25519.pub"),
  sshPrivateKeyPath: join(homedir(), ".ssh", "id_ed25519"),
  region: "nyc1",
  dropletSize: "s-2vcpu-4gb",
  dropletName: "rdev-env",
  kubernetesEngine: "k3s",
  useReservedIp: false,
};

export function loadConfig(): Config {
  const doToken = process.env["DO_TOKEN"];

  if (!doToken) {
    throw new Error(
      "DO_TOKEN environment variable is required.\n" +
        "Set it with: export DO_TOKEN=your_digitalocean_api_token"
    );
  }

  return {
    doToken,
    ...DEFAULT_CONFIG,
    // Override with env vars if set
    sshPublicKeyPath:
      process.env["SSH_PUBLIC_KEY_PATH"] ?? DEFAULT_CONFIG.sshPublicKeyPath,
    sshPrivateKeyPath:
      process.env["SSH_PRIVATE_KEY_PATH"] ?? DEFAULT_CONFIG.sshPrivateKeyPath,
    region: process.env["DO_REGION"] ?? DEFAULT_CONFIG.region,
    dropletSize: process.env["DO_DROPLET_SIZE"] ?? DEFAULT_CONFIG.dropletSize,
    dropletName: process.env["DO_DROPLET_NAME"] ?? DEFAULT_CONFIG.dropletName,
    kubernetesEngine:
      (process.env["K8S_ENGINE"] as "k3s" | "kind") ??
      DEFAULT_CONFIG.kubernetesEngine,
    useReservedIp:
      process.env["USE_RESERVED_IP"] !== undefined
        ? process.env["USE_RESERVED_IP"] === "true"
        : DEFAULT_CONFIG.useReservedIp,
  };
}

export function getTerraformDir(): string {
  // Resolve relative to this file's location
  return join(import.meta.dir, "..", "..", "terraform");
}
