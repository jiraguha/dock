# GPU Instance Support

## Overview

Support for GPU instances (L4, L40S, H100, etc.) on Scaleway with automatic image detection.

## The Problem

GPU instances require specific images with NVIDIA drivers pre-installed. Using the standard `ubuntu_jammy` image fails:

```
Error: could not get image 'fr-par-1/ubuntu_jammy': scaleway-sdk-go:
couldn't find a local image for the given zone (fr-par-1) and commercial type (L4-1-24G)
```

## Solution (v0.1.13)

### Auto-Detection

Terraform automatically detects GPU instance types and selects the appropriate image:

```hcl
# Detect GPU instances (L4, L40S, H100, GPU-, RENDER-)
is_gpu_instance = can(regex("^(GPU-|RENDER-|L4-|L40S-|H100-)", var.instance_type))

# Auto-select image
instance_image = var.instance_image != "" ? var.instance_image : (
  local.is_gpu_instance ? "gpu-os-12" : "ubuntu_jammy"
)
```

### Supported GPU Types

| Pattern | Examples | Image |
|---------|----------|-------|
| `L4-*` | L4-1-24G | gpu-os-12 |
| `L40S-*` | L40S-1-48G | gpu-os-12 |
| `H100-*` | H100-1-80G | gpu-os-12 |
| `GPU-*` | GPU-3070-S | gpu-os-12 |
| `RENDER-*` | RENDER-S | gpu-os-12 |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SCW_INSTANCE_TYPE` | Instance type (e.g., `L4-1-24G`) | `DEV1-M` |
| `SCW_INSTANCE_IMAGE` | Override auto-detected image | Auto-detect |
| `SCW_ZONE` | Scaleway zone | `fr-par-1` |

### Usage

```bash
# ~/.dock/.env
SCW_ACCESS_KEY=your_key
SCW_SECRET_KEY=your_secret
SCW_PROJECT_ID=your_project

# GPU instance
SCW_INSTANCE_TYPE=L4-1-24G
SCW_ZONE=fr-par-2  # GPU instances are usually in fr-par-2

# Optional: override image
# SCW_INSTANCE_IMAGE=gpu-os-12
```

Then:
```bash
dock create
```

## Important Notes

1. **Zone**: GPU instances are typically only available in specific zones:
   - L4 GPUs: `fr-par-2` (not `fr-par-1`)
   - Check Scaleway documentation for availability

2. **Image Override**: If auto-detection doesn't work, set `SCW_INSTANCE_IMAGE` explicitly

3. **Terraform Update**: After upgrading dock, update local terraform files:
   ```bash
   rm -rf ~/.dock/terraform
   dock create  # Will recreate terraform dir
   ```

## Deliverables

* [x] Auto-detect GPU instance types via regex
* [x] Use `gpu-os-12` for GPU instances
* [x] Use `ubuntu_jammy` for regular instances
* [x] `SCW_INSTANCE_IMAGE` env var for manual override
* [x] Pass `instance_image` through terraform vars
* [x] Document zone requirements for GPU instances

## Files Changed

- `terraform/main.tf` - Added `is_gpu_instance` and `instance_image` locals
- `terraform/variables.tf` - Added `instance_image` variable
- `src/types/index.ts` - Added `instanceImage` to Config and TerraformVars
- `src/core/config.ts` - Added `SCW_INSTANCE_IMAGE` env var support
- `src/cli/commands/create.ts` - Pass `instance_image` to terraform
- `src/cli/commands/destroy.ts` - Pass `instance_image` to terraform
