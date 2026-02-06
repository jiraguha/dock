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


# Issue 3 [RESOLVED]

**Problem:** `supabase start` fails with "Connection reset by peer" because Docker over SSH (`DOCKER_HOST=ssh://...`) creates a new SSH connection for every Docker command. Supabase spawns many parallel Docker commands which overwhelms SSH.

**Error:**
```
kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22
```

**Solution:** Added `dock docker-tunnel` command that forwards the Docker socket over a single persistent SSH connection instead of creating new connections per command.

**Usage:**
```bash
# Start the tunnel (daemon mode)
dock docker-tunnel -d

# Set Docker to use the local socket
export DOCKER_HOST=unix://~/.dock/sockets/docker.sock

# Now supabase works
supabase start

# Stop the tunnel when done
dock docker-tunnel --stop
```

**Files changed:**
- `src/cli/commands/docker-tunnel.ts` - New command for Docker socket forwarding
- `src/cli/index.ts` - Register docker-tunnel command
- `src/cli/commands/autocomplete.ts` - Add docker-tunnel to completions

**Why this works:** Instead of `DOCKER_HOST=ssh://root@IP` which spawns a new SSH for every Docker API call, `docker-tunnel` creates ONE SSH connection that forwards `/var/run/docker.sock` to a local socket. All Docker commands use this single tunnel.

---

## Original Issue Report

// I cannot run supabase on the remote server
// I start by opening the server

❯ dock portforward
Starting port forwarding...
Remote: 163.172.189.201
Ports: 3000, 8080, 5432, 6379, 27017, 54322, 54321
Mode: foreground

Equivalent command:
  ssh -N -L 3000:localhost:3000 -L 8080:localhost:8080 -L 5432:localhost:5432 -L 6379:localhost:6379 -L 27017:localhost:27017 -L 54322:localhost:54322 -L 54321:localhost:54321 -i ~/.ssh/id_rsa root@163.172.189.201

----------------------------------------
Port forwarding active!
----------------------------------------
  localhost:3000 -> 163.172.189.201:3000
  localhost:8080 -> 163.172.189.201:8080
  localhost:5432 -> 163.172.189.201:5432
  localhost:6379 -> 163.172.189.201:6379
  localhost:27017 -> 163.172.189.201:27017
  localhost:54322 -> 163.172.189.201:54322
  localhost:54321 -> 163.172.189.201:54321
----------------------------------------
Press Ctrl+C to stop

SSH tunnel exited with code 255


❯ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
❯ supabase start
[+] Pulling 152/152
 ✔ edge-runtime Pulled                                                                                                                                                                                                                                  58.6s
 ✔ kong Pulled                                                                                                                                                                                                                                          42.4s
 ✔ postgres Pulled                                                                                                                                                                                                                                     144.7s
 ✔ gotrue Pulled                                                                                                                                                                                                                                        35.8s
 ✔ realtime Pulled                                                                                                                                                                                                                                      57.3s
 ✔ logflare Pulled                                                                                                                                                                                                                                      77.9s
 ✔ vector Pulled                                                                                                                                                                                                                                        37.0s
 ✔ postgrest Pulled                                                                                                                                                                                                                                     28.3s
 ✔ studio Pulled                                                                                                                                                                                                                                        80.9s
 ✔ storage-api Pulled                                                                                                                                                                                                                                   81.0s
 ✔ mailpit Pulled                                                                                                                                                                                                                                       30.5s
 ✔ imgproxy Pulled                                                                                                                                                                                                                                      44.2s
 ✔ postgres-meta Pulled                                                                                                                                                                          

Starting database...
Initialising schema...
Seeding globals from roles.sql...
WARN: no files matched pattern: supabase/seed.sql
Starting containers...
Waiting for health checks...
supabase_vector_dock container logs:
2026-02-06T23:38:22.107678Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:22.107925Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:22.108022Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:22.243154Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:22.243548Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:22.243469594+00:00
2026-02-06T23:38:22.243643Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:22.573217Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:22.573314Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573380Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573422Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573456Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573489Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573533Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.573570Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:22.574718Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:22.575205Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:22.597242Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:22.597359Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:22.597389Z  INFO vector: Vector has stopped.
2026-02-06T23:38:22.604701Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="logflare_functions, kong_err, auth_logs, logflare_auth, realtime_logs, functions_logs, db_logs, kong_logs, logflare_rest, logflare_storage, storage_logs, logflare_kong, logflare_realtime, logflare_db" time_remaining="59 seconds left"
2026-02-06T23:38:23.300635Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:23.300862Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:23.300958Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:23.386092Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:23.387313Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:23.387221776+00:00
2026-02-06T23:38:23.387418Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:23.836990Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:23.837433Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837505Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837583Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837629Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837659Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837699Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.837729Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:23.838397Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:23.839344Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:23.861867Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:23.861912Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:23.861919Z  INFO vector: Vector has stopped.
2026-02-06T23:38:23.870195Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="functions_logs, logflare_functions, logflare_storage, storage_logs, db_logs, logflare_auth, logflare_db, logflare_realtime, logflare_kong, logflare_rest" time_remaining="59 seconds left"
2026-02-06T23:38:24.442892Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:24.443134Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:24.443236Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:24.531321Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:24.533240Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:24.533151616+00:00
2026-02-06T23:38:24.533995Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:24.914625Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:24.914841Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.914897Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.914926Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.914965Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.914996Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.915021Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.915042Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:24.915596Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:24.923463Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:24.958592Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:24.958639Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:24.958645Z  INFO vector: Vector has stopped.
2026-02-06T23:38:24.982102Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="rest_logs, kong_err, storage_logs, realtime_logs, logflare_kong, kong_logs, logflare_functions, logflare_db, logflare_rest, docker_host, auth_logs, logflare_storage, logflare_realtime, project_logs, logflare_auth, router, db_logs, functions_logs" time_remaining="59 seconds left"
2026-02-06T23:38:26.004319Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:26.004520Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:26.004607Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:26.076350Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:26.076847Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:26.076781528+00:00
2026-02-06T23:38:26.077024Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:26.424478Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:26.424812Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424854Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424864Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424871Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424879Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424885Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.424891Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:26.425276Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:26.425274Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:26.447862Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:26.447962Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:26.447984Z  INFO vector: Vector has stopped.
2026-02-06T23:38:26.451308Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="logflare_kong, db_logs, kong_logs, storage_logs, router, logflare_db, kong_err, auth_logs, logflare_functions, logflare_realtime, rest_logs, project_logs, functions_logs, realtime_logs, logflare_storage, logflare_rest, logflare_auth" time_remaining="59 seconds left"
2026-02-06T23:38:27.787580Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:27.789495Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:27.789817Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:27.928730Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:27.929371Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:27.929302368+00:00
2026-02-06T23:38:27.929585Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:28.435463Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:28.435855Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436030Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436213Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436378Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436548Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436705Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.436898Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:28.437695Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:28.438659Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:28.460010Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:28.460141Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:28.460168Z  INFO vector: Vector has stopped.
2026-02-06T23:38:28.486753Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="logflare_functions, logflare_rest" time_remaining="59 seconds left"
2026-02-06T23:38:30.532024Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:30.532443Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:30.532889Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:30.716193Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:30.720181Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:30.720096277+00:00
2026-02-06T23:38:30.720402Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:31.422081Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:31.422345Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.423608Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.423946Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.424128Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.430148Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.430702Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.431729Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:31.432687Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:31.434964Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:31.507538Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:31.507577Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:31.507583Z  INFO vector: Vector has stopped.
2026-02-06T23:38:31.528958Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="auth_logs, logflare_realtime, logflare_db, logflare_rest, realtime_logs, rest_logs, logflare_storage, db_logs, logflare_kong, functions_logs, kong_logs, logflare_functions, kong_err, router, project_logs, storage_logs, docker_host, logflare_auth" time_remaining="59 seconds left"
2026-02-06T23:38:35.346371Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:35.357383Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:35.357975Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:35.566295Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:35.575524Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:35.575459744+00:00
2026-02-06T23:38:35.578698Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:36.240076Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:36.252271Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.252534Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.252637Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.252737Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.252821Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.252922Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.253002Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:36.253678Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:36.267632Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:36.302884Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:36.303280Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:36.303359Z  INFO vector: Vector has stopped.
2026-02-06T23:38:36.313285Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="auth_logs, kong_logs, logflare_storage, logflare_functions, logflare_auth, rest_logs, logflare_realtime, docker_host, project_logs, router, storage_logs, kong_err, logflare_db, logflare_rest, logflare_kong, db_logs, functions_logs, realtime_logs" time_remaining="59 seconds left"
2026-02-06T23:38:44.082131Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:44.082448Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:44.082609Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:44.220848Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:44.221225Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:44.221156009+00:00
2026-02-06T23:38:44.221311Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:44.527123Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:44.527366Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527415Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527426Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527434Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527441Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527450Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.527456Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:44.529686Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:44.529847Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:44.549125Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:44.549246Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:44.549298Z  INFO vector: Vector has stopped.
2026-02-06T23:38:44.555734Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="kong_logs, logflare_storage, logflare_rest, storage_logs, logflare_realtime, logflare_kong, db_logs, auth_logs, logflare_db, logflare_functions, kong_err, logflare_auth, realtime_logs" time_remaining="59 seconds left"
2026-02-06T23:38:58.091672Z  INFO vector::app: Internal log rate limit configured. internal_log_rate_secs=10
2026-02-06T23:38:58.092783Z  INFO vector::app: Log level is enabled. level="vector=info,codec=info,vrl=info,file_source=info,tower_limit=trace,rdkafka=info,buffers=info,lapin=info,kube=info"
2026-02-06T23:38:58.093052Z  INFO vector::app: Loading configs. paths=["/etc/vector/vector.yaml"]
2026-02-06T23:38:58.167876Z  WARN vector::config::loading: Transform "router._unmatched" has no consumers
2026-02-06T23:38:58.168295Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Capturing logs from now on. now=2026-02-06T23:38:58.168228147+00:00
2026-02-06T23:38:58.168378Z  INFO source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listening to docker log events.
2026-02-06T23:38:58.455501Z  INFO vector::topology::running: Running healthchecks.
2026-02-06T23:38:58.455732Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455798Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455843Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455870Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455897Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455923Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.455939Z  INFO vector::topology::builder: Healthcheck passed.
2026-02-06T23:38:58.456133Z  INFO vector: Vector has started. debug="false" version="0.28.1" arch="x86_64" revision="ff15924 2023-03-06"
2026-02-06T23:38:58.456941Z ERROR source{component_kind="source" component_id=docker_host component_type=docker_logs component_name=docker_host}: vector::sources::docker_logs: Listing currently running containers failed. error=error trying to connect: No such file or directory (os error 2)
2026-02-06T23:38:58.475392Z  INFO vector::internal_events::api: API server running. address=0.0.0.0:9001 playground=http://0.0.0.0:9001/playground
2026-02-06T23:38:58.475441Z  INFO vector::app: All sources have finished.
2026-02-06T23:38:58.475447Z  INFO vector: Vector has stopped.
2026-02-06T23:38:58.476337Z  INFO vector::topology::running: Shutting down... Waiting on running components. remaining_components="logflare_realtime, kong_err, logflare_storage, storage_logs, logflare_functions, logflare_db, logflare_rest, logflare_auth, rest_logs, realtime_logs, logflare_kong, db_logs, kong_logs, auth_logs" time_remaining="59 seconds left"
Stopping containers...


supabase_vector_dock container is not ready: unhealthy
Try rerunning the command with --debug to troubleshoot the error.
❯
❯
❯ supabase start
Stopping containers...
unable to get image 'public.ecr.aws/supabase/kong:2.8.1': error during connect: Get "http://docker.example.com/v1.51/images/public.ecr.aws/supabase/kong:2.8.1/json": command [ssh -l root -o ConnectTimeout=30 -T -- 163.172.189.201 docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22

Try rerunning the command with --debug to troubleshoot the error.
❯ supabase start
Stopping containers...
unable to get image 'public.ecr.aws/supabase/edge-runtime:v1.70.0': error during connect: Get "http://docker.example.com/v1.51/images/public.ecr.aws/supabase/edge-runtime:v1.70.0/json": command [ssh -l root -o ConnectTimeout=30 -T -- 163.172.189.201 docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22

Try rerunning the command with --debug to troubleshoot the error.
❯ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
❯ docker ls
docker: unknown command: docker ls

Run 'docker --help' for more information
❯ dock stop
Shutting down instance...
Instance shut down.

----------------------------------------
Environment stopped.
Data is preserved. Run 'dock start' to resume.
Run 'dock destroy' to delete everything.
----------------------------------------
❯ dock start
Powering on instance...
Instance powered on.

Updating kubeconfig with new IP...
Fetching kubeconfig from remote...
Error: Failed to fetch kubeconfig: ssh: connect to host 163.172.189.201 port 22: Connection refused
scp: Connection closed

❯ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
❯ dock configure
Configuring remote SSH server...
  MaxStartups: 10:30:100
  MaxSessions: 30

SSH server configured successfully.

Current settings:
Remote SSH config:
MaxSessions 30
MaxStartups 10:30:100
❯ supabase start
Stopping containers...
unable to get image 'public.ecr.aws/supabase/logflare:1.30.5': error during connect: Get "http://docker.example.com/v1.51/images/public.ecr.aws/supabase/logflare:1.30.5/json": command [ssh -l root -o ConnectTimeout=30 -T -- 163.172.189.201 docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22

Try rerunning the command with --debug to troubleshoot the error.


❯ supabase start
topping containers...
unable to get image 'public.ecr.aws/supabase/logflare:1.30.5': error during connect: Get "http://docker.example.com/v1.51/images/public.ecr.aws/supabase/logflare:1.30.5/json": command [ssh -l root -o ConnectTimeout=30 -T -- 163.172.189.201 docker system dial-stdio] has exited with exit status 255, make sure the URL is valid, and Docker 18.09 or later is installed on the remote host: stderr=kex_exchange_identification: read: Connection reset by peer
Connection reset by 163.172.189.201 port 22




