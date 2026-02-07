import { installShellIntegration, getShellConfigPath, isShellIntegrationInstalled } from "../../core/autopilot";

export async function init(args: string[]): Promise<void> {
  const showHelp = args.includes("--help") || args.includes("-h");
  const removeFlag = args.includes("--remove");

  if (showHelp) {
    console.log(`
dock init - Set up shell integration for auto-pilot mode

Usage: dock init [options]

This command adds a line to your shell config file (e.g., ~/.zshrc)
that automatically sources ~/.dock/dock.init when you open a new terminal.

Options:
  --remove    Remove shell integration
  --help, -h  Show this help

What gets added to your shell config:
  [ -f ~/.dock/dock.init ] && source ~/.dock/dock.init

This enables automatic DOCKER_HOST and KUBECONFIG exports when
your dock environment is running.
`);
    return;
  }

  const configPath = getShellConfigPath();

  if (removeFlag) {
    console.log("To remove shell integration, edit your shell config file:");
    console.log(`  ${configPath}`);
    console.log("\nRemove the lines containing 'dock auto-pilot integration' or 'dock.init'");
    return;
  }

  // Check if already installed
  if (isShellIntegrationInstalled()) {
    console.log("Shell integration is already installed.");
    console.log(`Config file: ${configPath}`);
    return;
  }

  // Confirm with user
  console.log("This will add the following to your shell config:");
  console.log(`  ${configPath}`);
  console.log("");
  console.log("  # dock auto-pilot integration");
  console.log("  [ -f ~/.dock/dock.init ] && source ~/.dock/dock.init");
  console.log("");

  // Install
  const installed = installShellIntegration();
  if (installed) {
    console.log("Shell integration installed successfully.");
    console.log("");
    console.log("Restart your shell or run:");
    console.log(`  source ${configPath}`);
  } else {
    console.log("Failed to install shell integration.");
  }
}
