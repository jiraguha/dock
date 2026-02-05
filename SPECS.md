We are trying to solve the friction and hidden cost of local development infrastructure on modern laptops—especially when using Docker and Kubernetes. Local container runtimes require heavy virtual machines that continuously consume CPU, memory, and battery, causing heat, fan noise, degraded performance, and cognitive load. At the same time, fully managed cloud platforms often introduce long-lived resources, higher costs, and operational complexity that discourage experimentation and disposability.

The functional need is a remote development environment that feels local but behaves like disposable infrastructure. Developers must be able to create a full Docker + Kubernetes environment on demand, connect to it seamlessly via SSH and standard CLI tools (docker, kubectl), and work as if the environment were local. Crucially, when not in use, the environment must consume zero compute resources, either by being powered off or completely destroyed, without fear of lingering costs or leftover configuration.

Another core problem being addressed is manual orchestration and state drift. Today, developers often mix dashboard clicks, ad-hoc shell scripts, and partial automation, which makes environments fragile, non-reproducible, and hard to reset. The system must enforce Infrastructure as Code as the single source of truth, so creation, provisioning, lifecycle transitions (on/off), and destruction are deterministic, repeatable, and audit-able.

Finally, we want to collapse cognitive overhead by offering a simple, explicit lifecycle: create → work → stop → resume → destroy. Access (SSH, Docker, Kubernetes) must be one-click or one-command, without hidden magic. A UI (e.g. Electron) may wrap this lifecycle for ergonomics, but it must only orchestrate underlying IaC and CLI tools—not replace them—so that automation remains transparent, portable, and developer-controlled.

# 🎯 Goal

Build a **fully automated, disposable remote development infrastructure system** that lets you:

> **Create → Provision → Connect → Work → Power off/on → Reconnect → Destroy**
> with **IaC as the source of truth**, optionally wrapped in an **Electron app** (UX layer), while operations execute via **Terraform / CLI / SSH** under the hood.

The system must prioritize:

* **Disposability**
* **Predictability**
* **Low cognitive load**
* **Mac stays cold**
* **Reproducibility**

---

# 🧠 Core Principles

1. **Infra is stateless** — state lives in IaC + Git
2. **VM is disposable** — never sacred
3. **Single source of truth** — IaC state
4. **Explicit lifecycle** — no implicit magic
5. **Local feels local, but runs remote**
6. **UI is optional, CLI is canonical**

---

# 🧱 High-Level Architecture

```
┌──────────────┐
│ Electron App │  ← optional UX
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Local Orchestrator Layer │
│  - Bun / TS          │
│  - CLI wrappers          │
│  - State awareness       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ IaC Layer (Terraform)    │
│  - DigitalOcean          │
│  - VM lifecycle          │
│  - Networking            │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Remote VM                │
│  - Ubuntu                │
│  - Docker                │
│  - k3s / kind            │
│  - SSH                   │
└──────────────────────────┘
```

---

# 🧩 Functional Requirements

## 1️⃣ Infrastructure Creation (IaC)

### FR-1: Infrastructure must be created **only** via IaC

* Tool: **Terraform**
* Provider: **DigitalOcean**

**Resources created:**

* 1 VM (Droplet)
* Firewall (SSH + optional ports)
* Optional reserved IP
* No managed Kubernetes (VM-based only)

**Outputs required:**

* Public IP
* SSH user
* SSH key path
* VM state (running/stopped)

---

### FR-2: Provisioning must be automated

Provisioning steps executed automatically on VM creation:

* Install Docker
* Install Kubernetes (selectable):

  * `k3s` (default)
  * OR `kind` (optional profile)
* Enable SSH access
* Generate kubeconfig
* Place kubeconfig in predictable path

Provisioning mechanism:

* Terraform `cloud-init` OR
* Terraform `remote-exec`

---

## 2️⃣ Kubernetes / Docker Requirements

### FR-3: Kubernetes must be usable remotely

From local machine:

```bash
kubectl get nodes
kubectl apply -f …
```

* Kubeconfig retrieved automatically
* Server address rewritten to public IP
* No manual VM login required for kubectl

---

### FR-4: Docker must support remote usage

Two supported modes:

* SSH into VM and use Docker directly
* OR local Docker CLI via:

```bash
export DOCKER_HOST=ssh://user@vm-ip
```

---

## 3️⃣ Lifecycle Management

### FR-5: Explicit lifecycle states

The system must support **explicit transitions**:

| State          | Description             |
| -------------- | ----------------------- |
| `absent`       | No VM exists            |
| `provisioning` | Terraform apply running |
| `running`      | VM powered on           |
| `stopped`      | VM powered off          |
| `destroyed`    | Resources removed       |

---

### FR-6: Power management

* VM can be:

  * Powered ON
  * Powered OFF
  * Destroyed

Implementation:

* `terraform apply` → create / power on
* `doctl compute droplet-action shutdown` OR Terraform
* `terraform destroy` → full disposal

**Sleep is explicitly NOT required**.

---

## 4️⃣ Access & Workflows

### FR-7: SSH access

Must support:

* Standard SSH
* SSH command exposed via UI
* One-click “Open SSH” (Electron)

Example:

```bash
ssh dev@<ip>
```

---

### FR-8: Reconnect workflow

After power off → power on:

* New IP handled automatically (or reserved IP)
* SSH reconnects without manual config
* kubeconfig updated if needed

---

## 5️⃣ Destruction & Disposability

### FR-9: Guaranteed clean teardown

On destroy:

* VM deleted
* Disk deleted
* Firewall deleted
* No orphaned resources

Terraform destroy must return system to **zero-cost idle state**.

---

### FR-10: Stateless rebuild guarantee

It must be possible to:

```bash
destroy → apply → same result
```

With:

* Same Kubernetes version
* Same Docker setup
* Same access patterns

---

## 6️⃣ UI / Electron Application (Optional but Desired)

### FR-11: Electron app as UX layer

Electron app must:

* NOT replace Terraform
* NOT hide infra reality
* Only orchestrate & visualize

Functions:

* Create infra
* Show current state
* Power off / on
* Open SSH
* Fetch kubeconfig
* Destroy infra

---

### FR-12: Execution model

All actions executed via:

* Terraform CLI
* doctl
* SSH

Electron:

* Spawns processes
* Streams logs
* Shows progress
* Never mutates infra directly

---

## 7️⃣ Non-Functional Requirements

### NFR-1: Idempotency

Running the same action twice must not break state.

---

### NFR-2: Observability

* Logs from Terraform visible
* Clear error propagation
* No silent failures

---

### NFR-3: Security

* SSH keys only
* No password auth
* API tokens stored securely
* No secrets in UI state

---

### NFR-4: Portability

System must work:

* Without Electron (CLI-only)
* With Electron (UX-enhanced)

---

## 8️⃣ Tech Stack (Recommended)

| Layer              | Choice                         |
| ------------------ | ------------------------------ |
| IaC                | Terraform                      |
| Cloud              | DigitalOcean                   |
| OS                 | Ubuntu LTS                     |
| Kubernetes         | k3s (default)                  |
| Container runtime  | Docker                         |
| Local Orchestrator | Node.js / TypeScript           |
| UI                 | Electron                       |
| CLI                | terraform, doctl, ssh, kubectl |

---

# 🧠 Mental Model (Very Important)

This system is NOT:

* A managed PaaS
* A long-running server
* A pet VM

It IS:

> A **temporary, reproducible execution surface** for work

---

# 🏁 Final Lifecycle (Your exact wish, validated)

✅ Create (IaC)
✅ Provision (Docker + K8s)
✅ Open SSH
✅ Work
✅ Power off
✅ Power on
✅ Reopen SSH (via UI or CLI)
✅ Destroy (IaC)

Everything achievable today with **boring, reliable tools**.

---

## Side notes

The only real problem you are solving is this: how to safely and automatically create, control, and discard remote compute environments without installing or maintaining heavy tooling locally. Everything else (Terraform, kubectl, Docker CLI, scripts) is an implementation detail, not something the user should configure or even know about.

From that perspective, the only mandatory input the system needs is credentials to control DigitalOcean. Concretely: a DigitalOcean API token (and optionally an SSH key). That’s it. Once the system can authenticate to DigitalOcean, it can do everything else autonomously: create VMs, inject provisioning logic, manage lifecycle, and destroy resources.

All other “inputs” you discussed earlier (profiles, Kubernetes mode, VM size, region, lifecycle rules) are defaults owned by the system, not user input. They live:

either server-side (as templates, images, or manifests),

or inside the Electron app codebase as opinionated presets,

or are inferred dynamically (e.g. cheapest region, latest k3s).

The Electron app then becomes a remote control plane, not a config editor. Its job is not to ask questions, but to expose actions: Create Environment, Open SSH, Power Off, Power On, Destroy. The app never asks “how?” — it already knows. The user only decides when.

So the final requirement is deliberately extreme and powerful:

User input = cloud credentials only. Everything else is deterministic and automated.

That constraint is what keeps the system disposable, boring, safe, and fast — and prevents it from turning into “another DevOps tool” instead of a true execution surface.
