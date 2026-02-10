## 📸 Snapshot Image & Faster Startup Time

### Overview

Allow users to **create snapshots** from running remote environments, list them, and optionally **boot from those snapshots** to drastically reduce `dock create` time — especially for heavy setups (e.g., installed packages, preloaded containers, configured tools).

---

### 🧩 Core Commands

#### 1. `dock snapshot --create`

* **Purpose:** Create a snapshot from a currently running instance.
* **Snapshot name format (auto-generated):**

  ```
  <instanceType>-<instanceImage>-<zone>-<timestamp>
  ```

  Example:

  ```
  DEV1-S-ubuntu-jammy-fr-par-20260206T153010
  ```
* **Usage:**

  ```bash
  dock snapshot --create
  ```

#### 2. `dock snapshot --list`

* **Purpose:** List all available snapshots (with metadata).
* **Output:**

  ```
  NAME                                         CREATED               INSTANCE TYPE     IMAGE            ZONE
  DEV1-S-ubuntu-jammy-fr-par-20260206T153010   2026-02-06 14:52   DEV1-S         ubuntu-20.04     fr-par-2
  ```

#### 3. `dock create --snapshot`

* **Use latest matching snapshot** for the given instanceType.
* **Automatic match:** based on current `instanceType` (e.g., `DEV1-S`).
* **Usage:**

  ```bash
  dock create --snapshot
  ```

#### 4. `dock create --snapshot <snapshotName>`

* **Explicit use of a named snapshot** during creation.
* **Usage:**

  ```bash
  dock create --snapshot DEV1-S-ubuntu-jammy-fr-par-20260206T153010
  ```

---

### 💾 Snapshot Metadata

Each snapshot stores metadata like:

* Name
* Creation timestamp
* Instance type
* Image
* Zone
* Optional: Disk size, used packages, notes (future)

Metadata is stored locally in:

```
~/.dock/snapshots.json
```

And can be synced/stored remotely (optional, future work).

Excellent clarification — skipping **cloud-init provisioning** when creating from a snapshot makes perfect sense, since the image is already pre-configured. Here's the updated spec addition:

---

### 🚫 `dock create --snapshot`: Skip Cloud-Init Provisioning

When using:

```bash
dock create --snapshot
```

or:

```bash
dock create --snapshot <snapshotName>
```

👉 The instance must **skip the cloud-init (or provisioning) phase** entirely.

---

### Why?

* Snapshots are **already fully provisioned** (packages installed, config files written, etc.)
* Re-running provisioning could:

  * **Break** the image or overwrite changes
  * **Waste time**, defeating the purpose of fast startup

---

### Behavior Summary

| Command                         | Cloud-init Provisioning | Snapshot Used        |
| ------------------------------- | ----------------------- | -------------------- |
| `dock create`                   | ✅ Yes (default)         | ❌ No                 |
| `dock create --snapshot`        | ❌ **No** (skipped)      | ✅ Latest matching    |
| `dock create --snapshot <name>` | ❌ **No** (skipped)      | ✅ Specified snapshot |



---

### ✅ Benefits

* ⚡ **Faster `create` times** with pre-configured images
* 🔁 **Repeatable environments** (e.g., same Docker version, pre-pulled images)
* 🧪 **Testing setups** that can be torn down & recreated easily

---

### 🛠️ Deliverables

* [x] `dock snapshot --create` with name auto-generation and metadata storage
* [x] `dock snapshot --list` with nice CLI output
* [x] `dock create --snapshot` (auto match) logic
* [x] `dock create --snapshot <name>` (manual selection)
* [x] Snapshot metadata tracking in `~/.dock/snapshots.json`
* [x] Integration with analytics (`create` from snapshot vs fresh)

* [x] Add a flag internally to control cloud-init (or equivalent)
* [x] `dock create --snapshot` and `--snapshot <name>` must **automatically skip provisioning**
* [x] Clearly log in CLI: `🚀 Launching from snapshot: provisioning skipped.`

---

### Files Changed

- `src/core/snapshot.ts` - Core snapshot module (create, list, delete)
- `src/cli/commands/snapshot.ts` - CLI command for snapshot management
- `src/cli/commands/create.ts` - Added --snapshot flag support
- `src/cli/index.ts` - Registered snapshot command
- `src/types/index.ts` - Added snapshot_image_id and skip_provisioning to TerraformVars
- `terraform/variables.tf` - Added snapshot_image_id and skip_provisioning variables
- `terraform/main.tf` - Conditional cloud-init based on skip_provisioning

# Issue 1 ✅ RESOLVED

**Problem:** Could not find root volume for instance - two issues:
1. API returns `Volumes` (capital V) not `volumes`
2. SBS block storage volumes need different API (`scw block snapshot` vs `scw instance snapshot`)

**Solution (v0.1.16):**
- Check `Volumes` array first (newer API format)
- Detect SBS volume type (sbs_5k, etc.)
- Use `scw block snapshot create` for SBS volumes
- Use `scw instance snapshot create` for local volumes

# Issue 2 ✅ RESOLVED

**Problem:** `dock create --snapshot` fails with "undeclared variable" error for `snapshot_image_id` and `skip_provisioning`.

**Root cause:** Compiled binary couldn't sync terraform files from source directory. The `~/.dock/terraform/` had outdated variables.tf without the new snapshot variables.

**Solution (v0.1.17):**
- Embedded all terraform files directly in the binary (`src/core/terraform-files.ts`)
- On every dock command, terraform config files are written to `~/.dock/terraform/`
- This ensures the binary always has matching terraform configuration