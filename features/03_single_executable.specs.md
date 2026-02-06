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

* [x] Build pipeline to generate single executable binary
* [x] Release script (or GitHub Action) to push binaries to GitHub Releases
* [x] Install script (`install.sh`)
* [x] Documentation update with install and usage instructions
* [x] State management and file structure under `~/.dock`
* [x] (Optional) Checksum/signature validation for downloaded binaries

---

### ~/.dock Directory Structure

```
~/.dock/
├── .env              # User credentials and config
├── terraform/        # Terraform modules and state
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── providers.tf
│   ├── cloud-init/
│   ├── terraform.tfstate
│   └── .terraform/
└── portforward.pid   # Port forwarding process tracking
```

---

### Issues (Resolved)

#### Issue 1: .env not loaded from ~/.dock/.env
**Problem:** CLI didn't auto-load `.env` from `~/.dock/.env`

**Solution:** Added `loadDockEnv()` function that:
1. Loads `~/.dock/.env` if it exists
2. Falls back to `./.env` for development
3. Environment variables take precedence over .env file

#### Issue 2: Terraform state storage
**Problem:** Where to store terraform state for compiled binary?

**Solution:**
- Terraform files and state stored in `~/.dock/terraform/`
- On first run, terraform modules are copied from source to `~/.dock/terraform/`
- State persists across CLI updates