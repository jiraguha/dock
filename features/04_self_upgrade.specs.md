## 🔄 Self-Upgrading CLI — Specification

### Overview

Add support for **automatic self-upgrade** so the CLI can update itself to the latest released version without manual reinstallation and **without destroying any local state**.

---

### Goals

* **Seamless Self-Update:**
  The CLI must be able to check for a new version, download it, and replace its own binary **in place**.

* **Preserve Local State:**
  Updates must **not overwrite or delete** any user-specific data or configuration stored under:

  ```
  ~/.dock
  ```

* **Version Awareness:**
  The CLI should:

  * Display its current version (`dock version`)
  * Check for updates via GitHub Releases (or another endpoint)
  * Notify the user if an update is available
  * Offer optional flags:

    ```bash
    dock upgrade             # silent upgrade to latest
    dock upgrade --check     # only check for available update
    ```

* **Safe Binary Replacement:**
  Use a safe overwrite method for replacing the current executable:

  * Validate checksum of the downloaded binary
  * Ensure permissions and location remain intact

---

### Upgrade Flow

1. CLI checks current version against the latest available on GitHub.
2. If a new version is found:

   * Downloads the new binary to a temporary path.
   * Verifies integrity (optional: hash or signature check).
   * Replaces current binary safely.
   * Restarts or exits with a success message.
3. Local state in `~/.dock` is untouched.

---

### Deliverables

* [x] `dock upgrade` command
* [x] Version check and compare logic
* [x] Safe binary replacement logic
* [x] Compatibility with install script structure
* [ ] Optional: periodic version check on CLI usage
* [x] Documentation update
