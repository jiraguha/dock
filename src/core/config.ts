import { homedir } from "os";
import { join } from "path";
import type { Config } from "../types";

const DEFAULT_CONFIG: Omit<Config, "scwAccessKey" | "scwSecretKey" | "scwProjectId"> = {
  sshPublicKeyPath: join(homedir(), ".ssh", "id_ed25519.pub"),
  sshPrivateKeyPath: join(homedir(), ".ssh", "id_ed25519"),
  region: "fr-par",
  zone: "fr-par-1",
  instanceType: "DEV1-M",
  instanceName: "rdev-env",
  kubernetesEngine: "k3s",
  useReservedIp: false,
};

export function loadConfig(): Config {
  const scwAccessKey = process.env["SCW_ACCESS_KEY"];
  const scwSecretKey = process.env["SCW_SECRET_KEY"];
  const scwProjectId = process.env["SCW_PROJECT_ID"];

  if (!scwAccessKey || !scwSecretKey || !scwProjectId) {
    throw new Error(
      "Scaleway credentials are required.\n" +
        "Set them with:\n" +
        "  export SCW_ACCESS_KEY=your_access_key\n" +
        "  export SCW_SECRET_KEY=your_secret_key\n" +
        "  export SCW_PROJECT_ID=your_project_id"
    );
  }

  return {
    scwAccessKey,
    scwSecretKey,
    scwProjectId,
    ...DEFAULT_CONFIG,
    // Override with env vars if set
    sshPublicKeyPath:
      process.env["SSH_PUBLIC_KEY_PATH"] ?? DEFAULT_CONFIG.sshPublicKeyPath,
    sshPrivateKeyPath:
      process.env["SSH_PRIVATE_KEY_PATH"] ?? DEFAULT_CONFIG.sshPrivateKeyPath,
    region: process.env["SCW_REGION"] ?? DEFAULT_CONFIG.region,
    zone: process.env["SCW_ZONE"] ?? DEFAULT_CONFIG.zone,
    instanceType: process.env["SCW_INSTANCE_TYPE"] ?? DEFAULT_CONFIG.instanceType,
    instanceName: process.env["SCW_INSTANCE_NAME"] ?? DEFAULT_CONFIG.instanceName,
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
