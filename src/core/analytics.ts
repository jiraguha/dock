import { existsSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DOCK_HOME } from "./config";
import { loadConfig } from "./config";

const ANALYTICS_FILE = join(DOCK_HOME, "analytics.csv");
const CSV_HEADERS = "startTimestamp,command,instanceType,instanceImage,zone,duration,status";

export type TrackedCommand = "create" | "start" | "stop" | "destroy";

interface AnalyticsEntry {
  startTimestamp: string;
  command: TrackedCommand;
  instanceType: string;
  instanceImage: string;
  zone: string;
  duration: string;
  status: "success" | "error";
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function ensureCsvExists(): void {
  if (!existsSync(ANALYTICS_FILE)) {
    writeFileSync(ANALYTICS_FILE, CSV_HEADERS + "\n");
  }
}

function appendEntry(entry: AnalyticsEntry): void {
  ensureCsvExists();
  const line = `${entry.startTimestamp},${entry.command},${entry.instanceType},${entry.instanceImage},${entry.zone},${entry.duration},${entry.status}`;
  appendFileSync(ANALYTICS_FILE, line + "\n");
}

function getStatusEmoji(command: TrackedCommand, status: "success" | "error"): string {
  if (status === "error") return "\u274C";
  switch (command) {
    case "create":
      return "\u2705";
    case "start":
      return "\u25B6\uFE0F";
    case "stop":
      return "\uD83D\uDED1";
    case "destroy":
      return "\uD83D\uDDD1\uFE0F";
    default:
      return "\u2705";
  }
}

function getStatusMessage(command: TrackedCommand): string {
  switch (command) {
    case "create":
      return "Instance created successfully";
    case "start":
      return "Instance started";
    case "stop":
      return "Instance stopped";
    case "destroy":
      return "Instance destroyed";
    default:
      return "Command completed";
  }
}

export async function trackCommand<T>(
  command: TrackedCommand,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();

  let config;
  try {
    config = loadConfig();
  } catch {
    // Config might not be available for some commands
    config = {
      instanceType: "unknown",
      instanceImage: "",
      zone: "unknown",
    };
  }

  let status: "success" | "error" = "success";
  let result: T;

  try {
    result = await fn();
  } catch (error) {
    status = "error";
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    const duration = formatDuration(durationSeconds);

    appendEntry({
      startTimestamp,
      command,
      instanceType: config.instanceType,
      instanceImage: config.instanceImage || "auto",
      zone: config.zone,
      duration,
      status,
    });

    console.log(`\n${getStatusEmoji(command, status)} Command failed after ${duration}`);
    throw error;
  }

  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);
  const duration = formatDuration(durationSeconds);

  appendEntry({
    startTimestamp,
    command,
    instanceType: config.instanceType,
    instanceImage: config.instanceImage || "auto",
    zone: config.zone,
    duration,
    status,
  });

  console.log(`\n${getStatusEmoji(command, status)} ${getStatusMessage(command)} in ${duration}`);

  return result;
}

export function getAnalyticsPath(): string {
  return ANALYTICS_FILE;
}
