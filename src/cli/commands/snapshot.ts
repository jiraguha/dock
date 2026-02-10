import { loadConfig } from "../../core/config";
import { detectState } from "../../core/state";
import {
  createSnapshot,
  listSnapshots,
  deleteSnapshot,
  SnapshotMetadata,
} from "../../core/snapshot";

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function printSnapshotTable(snapshots: SnapshotMetadata[]): void {
  if (snapshots.length === 0) {
    console.log("No snapshots found.");
    console.log("\nCreate one with: dock snapshot --create");
    return;
  }

  console.log("Available Snapshots:");
  console.log("\u2500".repeat(100));
  console.log(
    "NAME".padEnd(45) +
      "CREATED".padEnd(20) +
      "TYPE".padEnd(12) +
      "ZONE".padEnd(12) +
      "IMAGE"
  );
  console.log("\u2500".repeat(100));

  for (const s of snapshots) {
    console.log(
      s.name.padEnd(45) +
        formatDate(s.createdAt).padEnd(20) +
        s.instanceType.padEnd(12) +
        s.zone.padEnd(12) +
        s.baseImage
    );
  }
  console.log("\u2500".repeat(100));
  console.log(`\nTotal: ${snapshots.length} snapshot(s)`);
}

export async function snapshot(args: string[]): Promise<void> {
  const hasCreate = args.includes("--create");
  const hasList = args.includes("--list") || args.includes("-l");
  const hasDelete = args.includes("--delete");

  if (hasDelete) {
    const deleteIndex = args.indexOf("--delete");
    const snapshotName = args[deleteIndex + 1];
    if (!snapshotName) {
      console.error("Usage: dock snapshot --delete <snapshot-name>");
      process.exit(1);
    }
    await deleteSnapshot(snapshotName);
    return;
  }

  if (hasList || (!hasCreate && !hasDelete)) {
    const snapshots = await listSnapshots();
    printSnapshotTable(snapshots);
    return;
  }

  if (hasCreate) {
    const state = await detectState();

    if (state.state !== "running") {
      console.error("No running instance found.");
      console.error("Start or create an instance first with 'dock create' or 'dock start'.");
      process.exit(1);
    }

    const config = loadConfig();

    console.log("\uD83D\uDCF8 Creating snapshot from running instance...\n");

    const metadata = await createSnapshot(
      config.instanceType,
      config.instanceImage,
      config.zone
    );

    console.log("\n\u2500".repeat(50));
    console.log("\u2705 Snapshot created successfully!");
    console.log("\u2500".repeat(50));
    console.log(`Name:     ${metadata.name}`);
    console.log(`Image ID: ${metadata.imageId}`);
    console.log(`Zone:     ${metadata.zone}`);
    console.log("\u2500".repeat(50));
    console.log("\nUse this snapshot with:");
    console.log(`  dock create --snapshot ${metadata.name}`);
    console.log("\nOr use the latest matching snapshot:");
    console.log("  dock create --snapshot");
    return;
  }

  // Default: show help
  console.log(`
dock snapshot - Manage instance snapshots

Usage:
  dock snapshot              List all snapshots (default)
  dock snapshot --list       List all snapshots
  dock snapshot --create     Create snapshot from running instance
  dock snapshot --delete <name>  Delete a snapshot

Examples:
  dock snapshot --create     Create a snapshot
  dock snapshot --list       List available snapshots
  dock snapshot --delete DEV1-S-ubuntu-jammy-fr-par-1-20260210T120000
`);
}
