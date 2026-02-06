# Issue 1 [RESOLVED]

**Problem:** Docker over SSH fails after `dock create` because the host key is not in `known_hosts`.

**Error:**
```
error during connect: ... Host key verification failed.
```

**Solution:** Added `ssh-keyscan` to automatically add the host key to `~/.ssh/known_hosts` during environment creation.

**Files changed:**
- `src/cli/commands/create.ts` - Added `addToKnownHosts()` function that runs after provisioning completes

# Issue 2 [RESOLVED]

**Problem:** `dock upgrade` wasn't replacing the correct binary. It replaced `process.argv[0]` which wasn't the installed `/usr/local/bin/dock`.

**Solution:** Use `which dock` to find the actual installed binary location, with fallback to `/usr/local/bin/dock`.

**Files changed:**
- `src/core/upgrade.ts` - Fixed `getCurrentExecutablePath()` to use `which dock`