import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { DOCK_HOME } from "../../core/config";

const COMMANDS = [
  "create",
  "destroy",
  "status",
  "ssh",
  "ssh-config",
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
  "connection",
  "init",
  "analytics",
  "snapshot",
  "env",
];

const BASH_COMPLETION = `# dock bash completion
_dock_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="create destroy status ssh ssh-config start stop kubeconfig docker-env docker-tunnel portforward configure upgrade version autocomplete connection init analytics snapshot env"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
  elif [[ \${COMP_CWORD} -eq 2 ]]; then
    case "\${COMP_WORDS[1]}" in
      create)
        COMPREPLY=($(compgen -W "--snapshot --help" -- "\${cur}"))
        ;;
      destroy)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      status)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      ssh)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      start)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      stop)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      kubeconfig)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      docker-env)
        COMPREPLY=($(compgen -W "--help" -- "\${cur}"))
        ;;
      portforward)
        COMPREPLY=($(compgen -W "-d --stop --status --help" -- "\${cur}"))
        ;;
      docker-tunnel)
        COMPREPLY=($(compgen -W "-d --stop --status --help" -- "\${cur}"))
        ;;
      ssh-config)
        COMPREPLY=($(compgen -W "--show --remove --start-master --stop-master --help" -- "\${cur}"))
        ;;
      configure)
        COMPREPLY=($(compgen -W "--show --help" -- "\${cur}"))
        ;;
      upgrade)
        COMPREPLY=($(compgen -W "--check --help" -- "\${cur}"))
        ;;
      autocomplete)
        COMPREPLY=($(compgen -W "--generate --bash --zsh --help" -- "\${cur}"))
        ;;
      connection)
        COMPREPLY=($(compgen -W "--refresh --clean --status --help" -- "\${cur}"))
        ;;
      init)
        COMPREPLY=($(compgen -W "--remove --help" -- "\${cur}"))
        ;;
      analytics)
        COMPREPLY=($(compgen -W "--last --all --help" -- "\${cur}"))
        ;;
      snapshot)
        COMPREPLY=($(compgen -W "--create --list --delete --help" -- "\${cur}"))
        ;;
      env)
        COMPREPLY=($(compgen -W "--list --set --unset --help" -- "\${cur}"))
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
    'ssh-config:Set up SSH multiplexing (ControlMaster)'
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
    'connection:Manage connections (refresh, clean)'
    'init:Set up shell integration (one-time)'
    'analytics:Show usage stats and operation history'
    'snapshot:Create/list snapshots for faster startups'
    'env:Manage environment variables'
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
        create)
          _arguments \\
            '--snapshot[Boot from snapshot (fast startup)]' \\
            '--help[Show help]'
          ;;
        destroy|status|ssh|start|stop|kubeconfig|docker-env|version)
          _arguments '--help[Show help]'
          ;;
        portforward)
          _arguments \\
            '-d[Run in background]' \\
            '--stop[Stop background tunnel]' \\
            '--status[Show tunnel status]' \\
            '--help[Show help]'
          ;;
        docker-tunnel)
          _arguments \\
            '-d[Run in background]' \\
            '--stop[Stop Docker tunnel]' \\
            '--status[Show tunnel status]' \\
            '--help[Show help]'
          ;;
        ssh-config)
          _arguments \\
            '--show[Show current config]' \\
            '--remove[Remove dock SSH config]' \\
            '--start-master[Start master connection]' \\
            '--stop-master[Stop master connection]' \\
            '--help[Show help]'
          ;;
        configure)
          _arguments \\
            '--show[Show remote SSH config]' \\
            '--help[Show help]'
          ;;
        upgrade)
          _arguments \\
            '--check[Check for updates only]' \\
            '--help[Show help]'
          ;;
        autocomplete)
          _arguments \\
            '--generate[Only generate script]' \\
            '--bash[Generate bash completion]' \\
            '--zsh[Generate zsh completion]' \\
            '--help[Show help]'
          ;;
        connection)
          _arguments \\
            '--refresh[Restart all connections]' \\
            '--clean[Stop all connections]' \\
            '--status[Show connection status]' \\
            '--help[Show help]'
          ;;
        init)
          _arguments \\
            '--remove[Remove shell integration]' \\
            '--help[Show help]'
          ;;
        analytics)
          _arguments \\
            '--last[Show last 10 operations]' \\
            '--all[Show all operations]' \\
            '--help[Show help]'
          ;;
        snapshot)
          _arguments \\
            '--create[Create snapshot from running instance]' \\
            '--list[List available snapshots]' \\
            '--delete[Delete a snapshot]' \\
            '--help[Show help]'
          ;;
        env)
          _arguments \\
            '--list[List environment variables]' \\
            '--set[Set environment variables (KEY=val,KEY2=val)]' \\
            '--unset[Remove environment variables (KEY1,KEY2)]' \\
            '--help[Show help]'
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
