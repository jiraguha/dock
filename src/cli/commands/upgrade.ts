import { checkForUpdate, performUpgrade, VERSION } from "../../core/upgrade";

export async function upgrade(args: string[]): Promise<void> {
  const checkOnly = args.includes("--check") || args.includes("-c");

  console.log(`Current version: ${VERSION}`);
  console.log("Checking for updates...\n");

  const info = await checkForUpdate();

  if (!info.updateAvailable) {
    console.log(`You're already on the latest version (${info.latestVersion})`);
    return;
  }

  console.log(`New version available: ${info.latestVersion}`);

  if (checkOnly) {
    console.log("\nRun 'dock upgrade' to install the update.");
    return;
  }

  if (!info.downloadUrl) {
    console.error("No binary available for your platform.");
    console.log("Please download manually from: https://github.com/jiraguha/dock/releases");
    process.exit(1);
  }

  console.log("");
  await performUpgrade(info);
}
