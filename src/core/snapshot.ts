import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runScw } from "./scw";
import { DOCK_HOME } from "./config";
import { terraformOutput } from "./terraform";

const SNAPSHOTS_FILE = join(DOCK_HOME, "snapshots.json");

export interface SnapshotMetadata {
  id: string;
  name: string;
  imageId: string;
  createdAt: string;
  instanceType: string;
  baseImage: string;
  zone: string;
}

interface SnapshotsStore {
  snapshots: SnapshotMetadata[];
}

function loadSnapshots(): SnapshotsStore {
  if (!existsSync(SNAPSHOTS_FILE)) {
    return { snapshots: [] };
  }
  const content = readFileSync(SNAPSHOTS_FILE, "utf-8");
  return JSON.parse(content);
}

function saveSnapshots(store: SnapshotsStore): void {
  writeFileSync(SNAPSHOTS_FILE, JSON.stringify(store, null, 2));
}

function generateSnapshotName(
  instanceType: string,
  baseImage: string,
  zone: string
): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const cleanImage = baseImage.replace(/[^a-zA-Z0-9]/g, "-");
  return `${instanceType}-${cleanImage}-${zone}-${timestamp}`;
}

export async function createSnapshot(
  instanceType: string,
  baseImage: string,
  zone: string
): Promise<SnapshotMetadata> {
  const outputs = await terraformOutput();
  if (!outputs) {
    throw new Error("No running instance found. Run 'dock create' first.");
  }

  const instanceId = outputs.instance_id;
  // Extract UUID from instance_id (format: zone/uuid)
  const instanceUuid = instanceId.includes("/")
    ? (instanceId.split("/")[1] ?? instanceId)
    : instanceId;

  console.log("Getting instance details...");

  // Get the root volume ID
  const serverOutput = await runScw([
    "instance",
    "server",
    "get",
    instanceUuid,
    `zone=${zone}`,
    "-o",
    "json",
  ]);
  const serverData = JSON.parse(serverOutput);

  // Get root volume - handle different API response formats
  let rootVolume = null;

  // Try volumes["0"] format
  if (serverData.volumes?.["0"]) {
    rootVolume = serverData.volumes["0"];
  }
  // Try volumes as array
  else if (Array.isArray(serverData.volumes) && serverData.volumes.length > 0) {
    rootVolume = serverData.volumes[0];
  }
  // Try root_volume property
  else if (serverData.root_volume) {
    rootVolume = serverData.root_volume;
  }
  // Try image.root_volume
  else if (serverData.image?.root_volume) {
    rootVolume = serverData.image.root_volume;
  }

  if (!rootVolume || !rootVolume.id) {
    console.error("Server data volumes:", JSON.stringify(serverData.volumes, null, 2));
    console.error("Server data root_volume:", JSON.stringify(serverData.root_volume, null, 2));
    throw new Error("Could not find root volume for instance. Check server response above.");
  }

  const volumeId = rootVolume.id;
  const snapshotName = generateSnapshotName(instanceType, baseImage, zone);

  console.log(`Creating snapshot from volume ${volumeId}...`);
  console.log(`Snapshot name: ${snapshotName}`);

  // Create snapshot from volume
  const snapshotOutput = await runScw([
    "instance",
    "snapshot",
    "create",
    `volume-id=${volumeId}`,
    `name=${snapshotName}`,
    `zone=${zone}`,
    "-o",
    "json",
    "--wait",
  ]);
  const snapshotData = JSON.parse(snapshotOutput);
  const snapshotId = snapshotData.snapshot.id;

  console.log(`Snapshot created: ${snapshotId}`);
  console.log("Creating bootable image from snapshot...");

  // Create image from snapshot
  const imageOutput = await runScw([
    "instance",
    "image",
    "create",
    `snapshot-id=${snapshotId}`,
    `name=${snapshotName}`,
    `arch=x86_64`,
    `zone=${zone}`,
    "-o",
    "json",
  ]);
  const imageData = JSON.parse(imageOutput);
  const imageId = imageData.image.id;

  console.log(`Bootable image created: ${imageId}`);

  // Store metadata
  const metadata: SnapshotMetadata = {
    id: snapshotId,
    name: snapshotName,
    imageId,
    createdAt: new Date().toISOString(),
    instanceType,
    baseImage: baseImage || "auto",
    zone,
  };

  const store = loadSnapshots();
  store.snapshots.push(metadata);
  saveSnapshots(store);

  return metadata;
}

export async function listSnapshots(): Promise<SnapshotMetadata[]> {
  const store = loadSnapshots();
  return store.snapshots;
}

export async function findLatestSnapshot(
  instanceType: string,
  zone: string
): Promise<SnapshotMetadata | null> {
  const store = loadSnapshots();
  const matching = store.snapshots
    .filter((s) => s.instanceType === instanceType && s.zone === zone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return matching[0] ?? null;
}

export async function findSnapshotByName(
  name: string
): Promise<SnapshotMetadata | null> {
  const store = loadSnapshots();
  return store.snapshots.find((s) => s.name === name) ?? null;
}

export async function deleteSnapshot(name: string): Promise<void> {
  const store = loadSnapshots();
  const snapshot = store.snapshots.find((s) => s.name === name);

  if (!snapshot) {
    throw new Error(`Snapshot not found: ${name}`);
  }

  console.log(`Deleting image ${snapshot.imageId}...`);
  try {
    await runScw([
      "instance",
      "image",
      "delete",
      snapshot.imageId,
      `zone=${snapshot.zone}`,
      "--force",
    ]);
  } catch {
    console.log("Image already deleted or not found");
  }

  console.log(`Deleting snapshot ${snapshot.id}...`);
  try {
    await runScw([
      "instance",
      "snapshot",
      "delete",
      snapshot.id,
      `zone=${snapshot.zone}`,
      "--force",
    ]);
  } catch {
    console.log("Snapshot already deleted or not found");
  }

  // Remove from local store
  store.snapshots = store.snapshots.filter((s) => s.name !== name);
  saveSnapshots(store);

  console.log(`Snapshot ${name} deleted.`);
}

export function getSnapshotsPath(): string {
  return SNAPSHOTS_FILE;
}
