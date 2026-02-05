import { spawn } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { getTerraformDir } from "./config";
import type { TerraformOutputs, TerraformVars } from "../types";

export interface TerraformOptions {
  autoApprove?: boolean;
  vars?: TerraformVars;
}

export async function terraformInit(): Promise<void> {
  await runTerraform(["init", "-input=false"]);
}

export async function terraformApply(
  options: TerraformOptions = {}
): Promise<void> {
  const args = ["apply", "-input=false"];

  if (options.autoApprove) {
    args.push("-auto-approve");
  }

  if (options.vars) {
    for (const [key, value] of Object.entries(options.vars)) {
      if (value !== undefined) {
        args.push(`-var=${key}=${value}`);
      }
    }
  }

  await runTerraform(args);
}

export async function terraformDestroy(
  options: TerraformOptions = {}
): Promise<void> {
  const args = ["destroy", "-input=false"];

  if (options.autoApprove) {
    args.push("-auto-approve");
  }

  if (options.vars) {
    for (const [key, value] of Object.entries(options.vars)) {
      if (value !== undefined) {
        args.push(`-var=${key}=${value}`);
      }
    }
  }

  await runTerraform(args);
}

export async function terraformOutput(): Promise<TerraformOutputs | null> {
  const terraformDir = getTerraformDir();

  try {
    const proc = spawn({
      cmd: ["terraform", "output", "-json"],
      cwd: terraformDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return null;
    }

    const parsed = JSON.parse(output);

    // Transform from {key: {value: x}} to {key: x}
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(parsed)) {
      result[key] = (val as { value: unknown }).value;
    }

    return result as unknown as TerraformOutputs;
  } catch {
    return null;
  }
}

export async function terraformStateExists(): Promise<boolean> {
  const terraformDir = getTerraformDir();
  const statePath = join(terraformDir, "terraform.tfstate");
  return existsSync(statePath);
}

export async function terraformRefresh(
  options: TerraformOptions = {}
): Promise<void> {
  const args = ["refresh", "-input=false"];

  if (options.vars) {
    for (const [key, value] of Object.entries(options.vars)) {
      if (value !== undefined) {
        args.push(`-var=${key}=${value}`);
      }
    }
  }

  await runTerraform(args);
}

async function runTerraform(args: string[]): Promise<void> {
  const terraformDir = getTerraformDir();

  const proc = spawn({
    cmd: ["terraform", ...args],
    cwd: terraformDir,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Terraform exited with code ${exitCode}`);
  }
}
