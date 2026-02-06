import { checkForUpdate, performUpgrade, VERSION } from "../../core/upgrade";

export async function upgrade(args: string[]): Promise<void> {
  const checkOnly = args.includes("--check") || args.includes("-c");

  const info = await checkForUpdate();

  if (!info.updateAvailable) {
    console.log("Already up to date.");
    return;
  }

  console.log(`Update available: ${VERSION} → ${info.latestVersion}`);

  if (checkOnly) {
    console.log("Run 'dock upgrade' to install.");
    return;
  }

  if (!info.downloadUrl) {
    console.error("No binary available for your platform.");
    console.log("Download manually: https://github.com/jiraguha/dock/releases");
    process.exit(1);
  }

  await performUpgrade(info);
}
