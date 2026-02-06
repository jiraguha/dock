# Issue 1 [RESOLVED]

**Problem:** Docker over SSH fails after `dock create` because the host key is not in `known_hosts`.

**Error:**
```
error during connect: ... Host key verification failed.
```

**Solution:** Added `ssh-keyscan` to automatically add the host key to `~/.ssh/known_hosts` during environment creation.

**Files changed:**
- `src/cli/commands/create.ts` - Added `addToKnownHosts()` function that runs after provisioning completes
