import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { DOCK_HOME } from "../../core/config";

const COMMANDS = [
  "create",
  "destroy",
  "status",
  "ssh",
  "start",
  "stop",
  "kubeconfig",
  "docker-env",
  "docker-tunnel",
  "portforward",
  "configure",
  "upgrade",
  "version",
  "autocomplete",
];

const BASH_COMPLETION = `# dock bash completion
_dock_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="create destroy status ssh start stop kubeconfig docker-env docker-tunnel portforward configure upgrade version autocomplete"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
  elif [[ \${COMP_CWORD} -eq 2 ]]; then
    case "\${COMP_WORDS[1]}" in
      portforward)
        COMPREPLY=($(compgen -W "-d --stop --status" -- "\${cur}"))
        ;;
      docker-tunnel)
        COMPREPLY=($(compgen -W "-d --stop --status" -- "\${cur}"))
        ;;
      configure)
        COMPREPLY=($(compgen -W "--show" -- "\${cur}"))
        ;;
      upgrade)
        COMPREPLY=($(compgen -W "--check" -- "\${cur}"))
        ;;
      autocomplete)
        COMPREPLY=($(compgen -W "--generate --bash --zsh" -- "\${cur}"))
        ;;
    esac
  fi
}
complete -F _dock_completions dock
`;

const ZSH_COMPLETION = `#compdef dock

_dock() {
  local -a commands
  commands=(
    'create:Create and provision environment'
    'destroy:Destroy all resources'
    'status:Show current state'
    'ssh:Open SSH connection'
    'start:Power on stopped instance'
    'stop:Gracefully shutdown instance'
    'kubeconfig:Fetch/update local kubeconfig'
    'docker-env:Print DOCKER_HOST export command'
    'docker-tunnel:Forward Docker socket (single SSH connection)'
    'portforward:Forward ports from remote to local'
    'configure:Apply SSH server config to remote'
    'upgrade:Upgrade dock to latest version'
    'version:Show current version'
    'autocomplete:Set up shell autocompletion'
  )

  _arguments -C \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      _describe -t commands 'dock commands' commands
      ;;
    args)
      case $words[2] in
        portforward)
          _arguments \\
            '-d[Run in background]' \\
            '--stop[Stop background tunnel]' \\
            '--status[Show tunnel status]'
          ;;
        docker-tunnel)
          _arguments \\
            '-d[Run in background]' \\
            '--stop[Stop Docker tunnel]' \\
            '--status[Show tunnel status]'
          ;;
        configure)
          _arguments '--show[Show remote SSH config]'
          ;;
        upgrade)
          _arguments '--check[Check for updates only]'
          ;;
        autocomplete)
          _arguments \\
            '--generate[Only generate script]' \\
            '--bash[Generate bash completion]' \\
            '--zsh[Generate zsh completion]'
          ;;
      esac
      ;;
  esac
}

_dock
`;

function detectShell(): "bash" | "zsh" | "unknown" {
  const shell = process.env["SHELL"] || "";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("bash")) return "bash";
  return "unknown";
}

function getCompletionScript(shell: "bash" | "zsh"): string {
  return shell === "zsh" ? ZSH_COMPLETION : BASH_COMPLETION;
}

function getCompletionDir(): string {
  return join(DOCK_HOME, "completions");
}

function getShellConfigPath(shell: "bash" | "zsh"): string {
  const home = homedir();
  if (shell === "zsh") {
    // Try .zshrc first, fall back to .zprofile
    const zshrc = join(home, ".zshrc");
    if (existsSync(zshrc)) return zshrc;
    return join(home, ".zprofile");
  }
  // Bash: try .bashrc first, fall back to .bash_profile
  const bashrc = join(home, ".bashrc");
  if (existsSync(bashrc)) return bashrc;
  return join(home, ".bash_profile");
}

function isSourceLinePresent(configPath: string, sourceLine: string): boolean {
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");
  return content.includes(sourceLine) || content.includes("dock/completions");
}

export async function autocomplete(args: string[]): Promise<void> {
  const generateOnly = args.includes("--generate");
  const forceBash = args.includes("--bash");
  const forceZsh = args.includes("--zsh");

  // Determine shell
  let shell: "bash" | "zsh";
  if (forceBash) {
    shell = "bash";
  } else if (forceZsh) {
    shell = "zsh";
  } else {
    const detected = detectShell();
    if (detected === "unknown") {
      console.error("Could not detect shell. Use --bash or --zsh to specify.");
      process.exit(1);
    }
    shell = detected;
  }

  const completionDir = getCompletionDir();
  const completionFile = join(completionDir, shell === "zsh" ? "_dock" : "dock.bash");
  const script = getCompletionScript(shell);

  // Ensure completion directory exists
  if (!existsSync(completionDir)) {
    mkdirSync(completionDir, { recursive: true });
  }

  // Write completion script
  writeFileSync(completionFile, script);
  console.log(`Generated ${shell} completion script: ${completionFile}`);

  if (generateOnly) {
    console.log("\nTo use, add to your shell config:");
    if (shell === "zsh") {
      console.log(`  fpath=(${completionDir} $fpath)`);
      console.log("  autoload -Uz compinit && compinit");
    } else {
      console.log(`  source ${completionFile}`);
    }
    return;
  }

  // Install to shell config
  const configPath = getShellConfigPath(shell);
  let sourceLine: string;

  if (shell === "zsh") {
    sourceLine = `\n# dock autocompletion\nfpath=(${completionDir} $fpath)\nautoload -Uz compinit && compinit\n`;
  } else {
    sourceLine = `\n# dock autocompletion\nsource ${completionFile}\n`;
  }

  if (isSourceLinePresent(configPath, sourceLine)) {
    console.log(`Autocompletion already configured in ${configPath}`);
  } else {
    appendFileSync(configPath, sourceLine);
    console.log(`Added autocompletion to ${configPath}`);
  }

  console.log(`\nRestart your shell or run: source ${configPath}`);
}
