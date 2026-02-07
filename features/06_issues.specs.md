# Issue 1 [RESOLVED]

**Problem:** supabase start/stop/start fails with "Connection reset by peer" because Docker over SSH creates many rapid SSH connections. Without connection reuse, each Docker command spawns multiple SSH sessions.

**Error:**
```
kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22
```

**Solution:** Added `dock ssh-config` command that sets up SSH ControlMaster for connection multiplexing. This allows Docker to reuse a single SSH connection for all commands.

**Usage:**
```bash
# Set up SSH config with ControlMaster
dock ssh-config

# Start the master connection
dock ssh-config --start-master

# Use the 'dock' host alias instead of IP
export DOCKER_HOST=ssh://dock

# Now supabase works reliably
supabase start
supabase stop
supabase start  # Works!

# When done, stop master connection
dock ssh-config --stop-master
```

**Files changed:**
- `src/cli/commands/ssh-config.ts` - New command for SSH ControlMaster setup
- `src/cli/index.ts` - Register ssh-config command
- `src/cli/commands/autocomplete.ts` - Add ssh-config to completions

**Why this works:** ControlMaster creates a persistent "master" SSH connection. All subsequent SSH connections to the same host reuse this master connection via a Unix socket, eliminating the connection storm that causes "Connection reset by peer" errors.

---

## Original Issue Report

I am using supabase though docker "export DOCKER_HOST=ssh://root@163.172.189.201"!

// step to reproduce

supabase start --> ok
supabase stop --> ok
// just after
supabase start --> fails
unable to get image 'public.ecr.aws/supabase/mailpit:v1.22.3': error during connect: Get "http://docker.example.com/v1.51/images/public.ecr.aws/supabase/mailpit:v1.22.3/json": command [ssh -l root -o ConnectTimeout=30 -T -- 163.172.189.201 docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22

we already try to increase MaxStartups config but it might just be a workaroud + I do not know how much connection are need for supabase!

we might consider ControlMaster approach is the most effective because Docker makes many rapid SSH connections for image pulls, container operations, etc. Without connection reuse, each Docker command spawns multiple SSH sessions
