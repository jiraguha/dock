import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { DOCK_HOME } from "../../core/config";
import { join } from "path";

const ENV_FILE = join(DOCK_HOME, ".env");

interface EnvEntry {
  key: string;
  value: string;
}

function parseEnvFile(): EnvEntry[] {
  if (!existsSync(ENV_FILE)) {
    return [];
  }

  const content = readFileSync(ENV_FILE, "utf-8");
  const entries: EnvEntry[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return entries;
}

function writeEnvFile(entries: EnvEntry[]): void {
  // Backup existing file
  if (existsSync(ENV_FILE)) {
    copyFileSync(ENV_FILE, `${ENV_FILE}.backup`);
  }

  const content = entries.map((e) => `${e.key}=${e.value}`).join("\n") + "\n";
  writeFileSync(ENV_FILE, content);
}

function handleSet(args: string): void {
  if (!args) {
    console.error("Usage: dock env --set KEY=value,KEY2=value2");
    process.exit(1);
  }

  const pairs = args.split(",");
  const toSet: EnvEntry[] = [];

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) {
      console.error(`Invalid format: ${pair} (expected KEY=value)`);
      process.exit(1);
    }

    const key = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();

    if (!key) {
      console.error(`Invalid format: ${pair} (empty key)`);
      process.exit(1);
    }

    toSet.push({ key, value });
  }

  // Load existing entries
  const existing = parseEnvFile();

  // Update or add entries
  for (const newEntry of toSet) {
    const idx = existing.findIndex((e) => e.key === newEntry.key);
    if (idx >= 0) {
      existing[idx] = newEntry;
    } else {
      existing.push(newEntry);
    }
  }

  writeEnvFile(existing);

  console.log("Environment variables updated:");
  for (const entry of toSet) {
    console.log(`  ${entry.key}=${entry.value}`);
  }
}

function handleUnset(args: string): void {
  if (!args) {
    console.error("Usage: dock env --unset KEY1,KEY2");
    process.exit(1);
  }

  const keys = args.split(",").map((k) => k.trim());
  const existing = parseEnvFile();
  const remaining = existing.filter((e) => !keys.includes(e.key));

  if (remaining.length === existing.length) {
    console.log("No matching keys found to remove.");
    return;
  }

  const removed = existing.filter((e) => keys.includes(e.key));
  writeEnvFile(remaining);

  console.log("Environment variables removed:");
  for (const entry of removed) {
    console.log(`  ${entry.key}`);
  }
}

function handleList(): void {
  const entries = parseEnvFile();

  // Get default values for reference
  const defaults: Record<string, string> = {
    SCW_REGION: "fr-par",
    SCW_ZONE: "fr-par-1",
    SCW_INSTANCE_TYPE: "DEV1-M",
    SCW_INSTANCE_IMAGE: "(auto)",
    SCW_INSTANCE_NAME: "dock-env",
    K8S_ENGINE: "k3s",
    USE_RESERVED_IP: "false",
    FORWARD_PORTS: "8080,3000,5432,6379,27017",
    SSH_MAX_STARTUPS: "100:30:200",
    SSH_MAX_SESSIONS: "100",
  };

  // Calculate column widths
  const allKeys = [...new Set([...Object.keys(defaults), ...entries.map((e) => e.key)])];
  const maxKeyLen = Math.max(20, ...allKeys.map((k) => k.length));
  const maxValLen = Math.max(
    15,
    ...entries.map((e) => e.value.length),
    ...Object.values(defaults).map((v) => v.length)
  );

  const keyWidth = maxKeyLen + 2;
  const valWidth = Math.min(maxValLen + 2, 42);
  const srcWidth = 10;

  const divider = `+${"-".repeat(keyWidth)}+${"-".repeat(valWidth)}+${"-".repeat(srcWidth)}+`;

  console.log("\nDock Environment Configuration");
  console.log(divider);
  console.log(
    `| ${"Key".padEnd(keyWidth - 2)} | ${"Value".padEnd(valWidth - 2)} | ${"Source".padEnd(srcWidth - 2)} |`
  );
  console.log(divider);

  // Build a map of current values
  const envMap = new Map(entries.map((e) => [e.key, e.value]));

  // Show configured values first
  for (const entry of entries) {
    const val = entry.value.length > valWidth - 2
      ? entry.value.slice(0, valWidth - 5) + "..."
      : entry.value;
    console.log(
      `| ${entry.key.padEnd(keyWidth - 2)} | ${val.padEnd(valWidth - 2)} | ${"~/.dock".padEnd(srcWidth - 2)} |`
    );
  }

  // Show defaults that aren't overridden
  for (const [key, value] of Object.entries(defaults)) {
    if (!envMap.has(key)) {
      const val = value.length > valWidth - 2
        ? value.slice(0, valWidth - 5) + "..."
        : value;
      console.log(
        `| ${key.padEnd(keyWidth - 2)} | ${val.padEnd(valWidth - 2)} | ${"default".padEnd(srcWidth - 2)} |`
      );
    }
  }

  console.log(divider);
  console.log("\nNote: Values from ~/.dock/.env override defaults.");
  console.log("      System environment variables override both.");
}

export async function env(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes("--list") || args.includes("-l")) {
    handleList();
    return;
  }

  const setIndex = args.indexOf("--set");
  if (setIndex >= 0) {
    handleSet(args[setIndex + 1] ?? "");
    return;
  }

  const unsetIndex = args.indexOf("--unset");
  if (unsetIndex >= 0) {
    handleUnset(args[unsetIndex + 1] ?? "");
    return;
  }

  console.log("Usage: dock env [options]");
  console.log("");
  console.log("Options:");
  console.log("  --list, -l              List all environment variables");
  console.log("  --set KEY=val,KEY2=val  Set environment variables");
  console.log("  --unset KEY1,KEY2       Remove environment variables");
}
