## 📦 Single Executable CLI — Specification

### Overview

Package the CLI as a **single, self-contained executable** to simplify installation, distribution, and usage across systems. This approach removes external dependencies and ensures consistent behavior across environments.

---

### Goals

* **Self-Contained Binary:**
  The CLI must be packaged into a single executable binary that includes all dependencies.

* **Cross-Platform Support (Optional/Stretch Goal):**
  Ideally, support builds for major platforms (Linux, macOS, Windows).

* **Easy Installation:**
  Provide a one-line install command for users:

  ```bash
  curl -s https://raw.githubusercontent.com/jiraguha/dock/install.sh | bash
  ```

  The script should detect the OS, download the correct binary, and move it to a standard location (e.g., `/usr/local/bin/dock`).

---

### Persistent State

* The CLI will use the following directory to store persistent configuration and state:

  ```
  ~/.dock
  ```

  This folder may contain:

  * User settings
  * Auth/session tokens
  * Environment configs
  * CLI version metadata (for self-upgrade)

---

### Deliverables

* [ ] Build pipeline to generate single executable binary
* [ ] Release script (or GitHub Action) to push binaries to GitHub Releases
* [ ] Install script (`install.sh`)
* [ ] Documentation update with install and usage instructions
* [ ] State management and file structure under `~/.dock`
* [ ] (Optional) Checksum/signature validation for downloaded binaries
