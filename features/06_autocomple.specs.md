## ⚡ CLI Autocompletion — Specification

### Overview

Add support for **shell autocompletion** (e.g., bash, zsh, fish) with a one-liner installation command via:

```bash
dock autocomplete
```

This will generate and install the correct autocompletion script for the user's shell environment.

---

### Goals

* **Support Common Shells:**

  * Bash
  * Zsh
  * (Optional) Fish, PowerShell

* **One-Command Setup:**
  `dock autocomplete` detects the current shell and:

  * Generates the appropriate autocompletion script
  * Installs it in the correct location
  * Adds the necessary line to the user's shell config (`~/.bashrc`, `~/.zshrc`, etc.)

* **Idempotent:**
  Running `dock autocomplete` multiple times should not duplicate config or break the shell.

---

### Examples

```bash
# Enable autocomplete
dock autocomplete

# Optional: regenerate script manually
dock autocomplete --generate
```

---

### Deliverables

* [x] Built-in support for generating autocompletion script
* [x] Shell detection logic
* [x] Script installer that adds lines to `.bashrc`, `.zshrc`, etc.
* [x] Regeneration mode (`--generate`)
* [x] Manual shell override (`--bash`, `--zsh`)
