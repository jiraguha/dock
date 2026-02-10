## ⏱️ Duration Tracking & Analytics

### Goal

Track and display **execution duration** for key `dock` commands (e.g. `create`, `start`, `stop`, `destroy`), and log these operations with metadata to a persistent **CSV analytics file**.

This enables visibility into performance and operational history, both during development and for debugging or optimization.

---

### Tracked Commands

* `dock create`
* `dock start`
* `dock stop`
* `dock destroy`

---

### CLI Output Example

At the end of each tracked command, print a human-readable summary:

```bash
✅ Instance created successfully in 00:02:41
```

Or:

```bash
🛑 Instance stopped in 00:00:35
```

---

### CSV Logging

Each command execution appends a line to:

```
~/.dock/analytics.csv
```

#### Format:

```
startTimestamp,command,instanceType,instanceImage,zone,duration
```

#### Example:

```
2026-02-06T14:23:11Z,create,DEV1-S,gpu-os-12,fr-par-1,00:02:41
2026-02-06T15:12:09Z,stop,DEV1-S,gpu-os-12,fr-par-1,00:00:35
```

---

### How It Works

1. **Command Hooking:**
   Wrap tracked commands with timing logic:

   ```bash
   start=$(date +%s)
   # ... command execution ...
   end=$(date +%s)
   duration=$((end - start))
   ```

2. **Display Duration:**
   Format `duration` into `HH:MM:SS` and show it at the end of the command.

3. **Append to CSV:**
   Extract metadata from context/config:

   * `instanceType` → from provision config or flags
   * `instanceImage` → image used
   * `zone` → compute zone/region used
   * `command` → the `dock` subcommand
   * `startTimestamp` → UTC ISO format
   * `duration` → formatted string

---

### Deliverables

* [x] Duration tracking wrapper for all key commands
* [x] `~/.dock/analytics.csv` with append-only logic
* [x] Metadata parsing from active config
* [x] CLI-friendly duration message (emoji + time for UX)
* [x] CSV headers generated if file is missing
* [x] `dock analytics` to view usage summary/stats

---

### Files Changed

- `src/core/analytics.ts` - Core analytics module with `trackCommand()` wrapper
- `src/cli/commands/analytics.ts` - CLI command for viewing stats
- `src/cli/commands/create.ts` - Wrapped with duration tracking
- `src/cli/commands/start.ts` - Wrapped with duration tracking
- `src/cli/commands/stop.ts` - Wrapped with duration tracking
- `src/cli/commands/destroy.ts` - Wrapped with duration tracking
- `src/cli/index.ts` - Registered analytics command
