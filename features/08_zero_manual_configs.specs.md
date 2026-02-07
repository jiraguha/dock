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

* [ ] Auto-generated `dock.init`
* [ ] Shell integration logic (auto-append `source ~/.dock/dock.init`)
* [ ] Auto-run `ssh-config`, `portforward`, `DOCKER_HOST`, `KUBECONFIG` export after `start/create`
* [ ] Auto-clean/reset before `stop/destroy`
* [ ] State tracking under `~/.dock/state`
* [ ] `AUTO_PILOTE` env var support with opt-out
* [ ] `dock connection --refresh` and `--clean` commands

---

### Optional Stretch Features

* CLI prompt indicator (e.g., `[dock ⛴]`) when remote mode is active
* Shell-aware integration across different shells (bash/zsh/fish)
* Warning if switching shells without proper sourcing (fallback mode)

