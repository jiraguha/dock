## 🧠 Zero Manual Config / Auto-Pilot Mode

### Vision

Enable a **fully transparent developer experience** where remote environments feel completely local. After running `dock start` or `dock create`, your shell environment is automatically configured for remote Docker and Kubernetes, **without requiring any manual commands** like `eval $(dock docker-env)` or setting `KUBECONFIG`.

The system should automatically detect the current state and adjust the environment accordingly.

---

### Key Principles

* **Remote should feel local.**
* **State is explicit but automation is default.**
* **Users should not have to think about `DOCKER_HOST` or `KUBECONFIG`.**
* **No extra config files are required beyond what's generated.**

---

### Core Features

1. **`AUTO_PILOTE=true` by default**
   Environment variable that activates transparent mode. Can be overridden if needed.

2. **Persistent State Tracking**
   Store machine state in:

   ```
   ~/.dock/state (values: up, down, absent)
   ```

3. **`dock.init` Script**
   After any `create` or `start`, a script is generated:

   ```
   ~/.dock/dock.init
   ```

   Contents:

   ```bash
   dock ssh-config  
   export DOCKER_HOST=ssh://dock
   export KUBECONFIG=$HOME/.kube/dock-config
   ```

4. **Shell Auto-Sourcing**
   Append to `~/.zshrc`, `~/.bashrc`, or `~/.config/fish/config.fish`:

   ```bash
   [ -f ~/.dock/dock.init ] && source ~/.dock/dock.init
   ```

5. **State-Based Automation**

   | Command                   | Action                                                                            |
   | ------------------------- | --------------------------------------------------------------------------------- |
   | `dock create`             | Generate/init SSH config, set DOCKER_HOST & KUBECONFIG, start master, portforward |
   | `dock start`              | Same as above                                                                     |
   | `dock stop`               | Remove env vars, stop master, stop portforward                                    |
   | `dock destroy`            | Same as above                                                                     |
   | `dock ssh-config`         | Should be **automatically run** in create/start                                   |
   | `dock portforward -d`     | Should run by default on start/create                                             |
   | `dock ssh-config --stop`  | Should run before stop/destroy                                                    |
   | `dock portforward --stop` | Should run before stop/destroy                                                    |

6. **Connection Health Management**

   * `dock connection --refresh`:
     Stops and restarts SSH configs and port forwards (used when the remote session breaks or resets).

   * `dock connection --clean`:
     Stops all active sessions/ports (used to fully disconnect from remote).

---

### Deliverables

* [x] Auto-generated `dock.init`
* [x] Shell integration logic (via explicit `dock init` command)
* [x] Auto-run `ssh-config`, `portforward`, `DOCKER_HOST`, `KUBECONFIG` export after `start/create`
* [x] Auto-clean/reset before `stop/destroy`
* [x] State tracking under `~/.dock/state`
* [x] `AUTO_PILOT` env var support with opt-out
* [x] `dock connection --refresh` and `--clean` commands
* [x] `dock init` command for explicit shell integration

---

### Optional Stretch Features

* CLI prompt indicator (e.g., `[dock ⛴]`) when remote mode is active
* Shell-aware integration across different shells (bash/zsh/fish)
* Warning if switching shells without proper sourcing (fallback mode)


# Issue 1 ✅ RESOLVED

**Problem:** `installShellIntegration` was called automatically on every `dock create`/`dock start`, reading user's shell config files (which might contain secrets) without explicit consent.

**Solution (v0.1.10):**
- Removed automatic shell integration from `setupAutoPilot()`
- Added explicit `dock init` command for user consent
- Shell config files are only modified when user explicitly runs `dock init`
- `install.sh` now runs `dock init` at the end of installation (user consents by running the installer)

# Issue 2 ✅ RESOLVED

**Problem:** After `dock start`, SSH isn't immediately available but we try to fetch kubeconfig right away, causing "Operation timed out" error.

**Solution (v0.1.11):**
- Added `waitForSsh()` function that retries SSH connection (up to 30 attempts, 2 seconds apart)
- `dock start` now waits for SSH before fetching kubeconfig

---

<details>
<summary>Original error log</summary>

❯ dock stop
Cleaning up auto-pilot...
Shutting down instance...
Instance shut down.

----------------------------------------
Environment stopped.
Data is preserved. Run 'dock start' to resume.
Run 'dock destroy' to delete everything.
----------------------------------------
❯ dock start
Powering on instance...
Instance powered on.

Updating kubeconfig with new IP...
Fetching kubeconfig from remote...
Error: Failed to fetch kubeconfig: ssh: connect to host 163.172.189.201 port 22: Operation timed out
scp: Connection closed

// therefore dock.init is not generated


❯ k get pods --all-namespaces
^X^C // doe not work
❯ export KUBECONFIG=/Users/jpiraguha/.kube/dock-config
❯ k get pods --all-namespaces
NAMESPACE     NAME                                      READY   STATUS      RESTARTS      AGE
kube-system   coredns-7f496c8d7d-mnbwp                  1/1     Running     1 (10m ago)   4h7m
kube-system   helm-install-traefik-crd-mb6qf            0/1     Completed   0             4h7m
kube-system   helm-install-traefik-kmxjw                0/1     Completed   1             4h7m
kube-system   local-path-provisioner-578895bd58-27fd4   1/1     Running     1 (10m ago)   4h7m
kube-system   metrics-server-7b9c9c4b9c-l4nhr           1/1     Running     1 (10m ago)   4h7m
kube-system   svclb-traefik-b23ba2a2-5b

</details>