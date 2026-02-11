## 🌱 Environment Management via CLI

### Goal

Provide a CLI interface to manage environment variables in the `~/.dock/.env` file, which are used globally by the Dock CLI. Users can set, update, unset, and list environment variables easily.

---

### 🧩 Commands

#### ✅ `dock env --set ENV1=value1,ENV2=value2`

* Adds or updates the specified environment variables.
* Writes changes to the file:

  ```
  ~/.dock/.env
  ```
* Overwrites existing keys if they already exist.

**Example:**

```bash
dock env --set SCW_ACCESS_KEY=abc123,SCW_REGION=nl-ams
```

**Effect:**
Effect (~/.dock/.env):

```dotenv
SCW_ACCESS_KEY=abc123
SCW_REGION=nl-ams
```

---

#### ❌ `dock env --unset ENV1,ENV2`

* Removes the given environment variable(s) from the `~/.dock/.env` file if they exist.

**Example:**

```bash
dock env --unset SCW_REGION,SCW_INSTANCE_NAME
```

**Effect:**
`SCW_REGION` and `SCW_INSTANCE_NAME` lines are removed from the file.

---

#### 📋 `dock env --list`

* Displays all current environment variables stored in `~/.dock/.env` as a **formatted table**.
* Show values loaded from `~/.dock/.env` file (default), and note that **runtime or system env vars override these**.

**Example Output:**

```
+---------------------+-----------------------------------------+
| Key                 | Value                                   |
+---------------------+-----------------------------------------+
| SCW_ACCESS_KEY      | abc123                                  |
| SCW_REGION          | nl-ams                                  |
| SCW_INSTANCE_TYPE   | DEV1-M                                  |
| K8S_ENGINE          | k3s                                     |
+---------------------+-----------------------------------------+
Note: These values are loaded from Runtime DEFAULT, then override by ~/.dock/.env
```


---

### 🛠️ Deliverables

* [x] `dock env --set` parser and updater
* [x] `dock env --unset` remover
* [x] `dock env --list` with table output
* [x] Create `.env` file if missing
* [x] Add backup mechanism before modifying `.env`
* [x] Handle invalid input (e.g., `dock env --set INVALID or dock env --set INVALID=`)

---

### Files Changed

- `src/cli/commands/env.ts` - New env command implementation
- `src/cli/index.ts` - Registered env command
- `src/cli/commands/autocomplete.ts` - Added env to autocomplete
