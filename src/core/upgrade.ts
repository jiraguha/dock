import { spawn } from "bun";
import { existsSync, chmodSync, renameSync, unlinkSync } from "fs";
import { join } from "path";
import { DOCK_HOME } from "./config";

export const VERSION = "0.1.7";
const GITHUB_REPO = "jiraguha/dock";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

interface GitHubRelease {
  tag_name: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

interface UpgradeInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  downloadUrl: string | null;
  checksumUrl: string | null;
}

function getPlatformBinaryName(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    return arch === "arm64" ? "dock-darwin-arm64" : "dock-darwin-x64";
  } else if (platform === "linux") {
    return arch === "arm64" ? "dock-linux-arm64" : "dock-linux-x64";
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function compareVersions(current: string, latest: string): number {
  const cleanVersion = (v: string) => v.replace(/^v/, "");
  const currentParts = cleanVersion(current).split(".").map(Number);
  const latestParts = cleanVersion(latest).split(".").map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (curr < lat) return -1;
    if (curr > lat) return 1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpgradeInfo> {
  const binaryName = getPlatformBinaryName();

  try {
    const response = await fetch(GITHUB_API, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "dock-cli",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name;

    const binaryAsset = release.assets.find((a) => a.name === binaryName);
    const checksumAsset = release.assets.find((a) => a.name === "checksums.txt");

    return {
      currentVersion: VERSION,
      latestVersion,
      updateAvailable: compareVersions(VERSION, latestVersion) < 0,
      downloadUrl: binaryAsset?.browser_download_url ?? null,
      checksumUrl: checksumAsset?.browser_download_url ?? null,
    };
  } catch (error) {
    throw new Error(
      `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: { "User-Agent": "dock-cli" },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await Bun.write(destPath, buffer);
}

async function getExpectedChecksum(
  checksumUrl: string,
  binaryName: string
): Promise<string | null> {
  try {
    const response = await fetch(checksumUrl, {
      headers: { "User-Agent": "dock-cli" },
    });

    if (!response.ok) return null;

    const content = await response.text();
    for (const line of content.split("\n")) {
      if (line.includes(binaryName)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1 && parts[0]) {
          return parts[0];
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
  const proc = spawn({
    cmd: ["shasum", "-a", "256", filePath],
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  const actualChecksum = output.trim().split(/\s+/)[0];
  return actualChecksum === expectedChecksum;
}

async function getCurrentExecutablePath(): Promise<string> {
  // Try to find dock in PATH using 'which'
  const proc = spawn({
    cmd: ["which", "dock"],
    stdout: "pipe",
    stderr: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode === 0 && output.trim()) {
    return output.trim();
  }

  // Fallback to default install location
  return "/usr/local/bin/dock";
}

export async function performUpgrade(info: UpgradeInfo): Promise<void> {
  if (!info.downloadUrl) {
    throw new Error("No download URL available for your platform");
  }

  const binaryName = getPlatformBinaryName();
  const tempDir = join(DOCK_HOME, "tmp");
  const tempPath = join(tempDir, `dock-new-${Date.now()}`);
  const currentPath = await getCurrentExecutablePath();
  const backupPath = `${currentPath}.backup`;

  // Ensure temp directory exists
  if (!existsSync(tempDir)) {
    await Bun.write(join(tempDir, ".keep"), "");
  }

  console.log(`Downloading dock ${info.latestVersion}...`);
  await downloadFile(info.downloadUrl, tempPath);

  // Verify checksum if available
  if (info.checksumUrl) {
    console.log("Verifying checksum...");
    const expectedChecksum = await getExpectedChecksum(info.checksumUrl, binaryName);

    if (expectedChecksum) {
      const valid = await verifyChecksum(tempPath, expectedChecksum);
      if (!valid) {
        unlinkSync(tempPath);
        throw new Error("Checksum verification failed. Download may be corrupted.");
      }
      console.log("Checksum verified.");
    }
  }

  // Make new binary executable
  chmodSync(tempPath, 0o755);

  // Backup current binary
  console.log("Replacing binary...");
  if (existsSync(currentPath)) {
    try {
      renameSync(currentPath, backupPath);
    } catch {
      // May fail if running from dev environment
    }
  }

  // Move new binary to current location
  try {
    renameSync(tempPath, currentPath);
  } catch {
    // If rename fails (cross-device), copy and delete
    const content = await Bun.file(tempPath).arrayBuffer();
    await Bun.write(currentPath, content);
    chmodSync(currentPath, 0o755);
    unlinkSync(tempPath);
  }

  // Remove backup
  if (existsSync(backupPath)) {
    try {
      unlinkSync(backupPath);
    } catch {
      // Ignore backup cleanup errors
    }
  }

  console.log(`\nSuccessfully upgraded to dock ${info.latestVersion}`);
}
