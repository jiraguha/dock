import { existsSync, readFileSync } from "fs";
import { getAnalyticsPath } from "../../core/analytics";

interface AnalyticsEntry {
  startTimestamp: string;
  command: string;
  instanceType: string;
  instanceImage: string;
  zone: string;
  duration: string;
  status: string;
}

function parseCsv(content: string): AnalyticsEntry[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const [startTimestamp, command, instanceType, instanceImage, zone, duration, status] =
      line.split(",");
    return {
      startTimestamp: startTimestamp ?? "",
      command: command ?? "",
      instanceType: instanceType ?? "",
      instanceImage: instanceImage ?? "",
      zone: zone ?? "",
      duration: duration ?? "",
      status: status ?? "",
    };
  });
}

function durationToSeconds(duration: string): number {
  const parts = duration.split(":");
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts.map((p) => parseInt(p, 10));
  return (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function analytics(args: string[]): Promise<void> {
  const analyticsPath = getAnalyticsPath();

  if (!existsSync(analyticsPath)) {
    console.log("No analytics data yet. Run some dock commands first.");
    return;
  }

  const content = readFileSync(analyticsPath, "utf-8");
  const entries = parseCsv(content);

  if (entries.length === 0) {
    console.log("No analytics data yet. Run some dock commands first.");
    return;
  }

  // Show last N entries or summary
  const showLast = args.includes("--last");
  const showAll = args.includes("--all");

  if (showAll || showLast) {
    const count = showAll ? entries.length : 10;
    const toShow = entries.slice(-count);

    console.log("Recent Operations:");
    console.log("─".repeat(80));
    console.log(
      "Timestamp".padEnd(22) +
        "Command".padEnd(10) +
        "Type".padEnd(12) +
        "Zone".padEnd(12) +
        "Duration".padEnd(12) +
        "Status"
    );
    console.log("─".repeat(80));

    for (const entry of toShow) {
      const date = new Date(entry.startTimestamp).toLocaleString();
      console.log(
        date.padEnd(22) +
          entry.command.padEnd(10) +
          entry.instanceType.padEnd(12) +
          entry.zone.padEnd(12) +
          entry.duration.padEnd(12) +
          entry.status
      );
    }
    console.log("─".repeat(80));
    return;
  }

  // Default: show summary stats
  const commands = ["create", "start", "stop", "destroy"];
  const stats: Record<string, { count: number; totalSeconds: number; successCount: number }> = {};

  for (const cmd of commands) {
    stats[cmd] = { count: 0, totalSeconds: 0, successCount: 0 };
  }

  for (const entry of entries) {
    const cmd = entry.command;
    if (stats[cmd]) {
      stats[cmd].count++;
      stats[cmd].totalSeconds += durationToSeconds(entry.duration);
      if (entry.status === "success") {
        stats[cmd].successCount++;
      }
    }
  }

  console.log("Dock Analytics Summary");
  console.log("─".repeat(60));
  console.log(
    "Command".padEnd(12) +
      "Count".padEnd(10) +
      "Total Time".padEnd(14) +
      "Avg Time".padEnd(14) +
      "Success Rate"
  );
  console.log("─".repeat(60));

  for (const cmd of commands) {
    const s = stats[cmd];
    if (!s || s.count === 0) continue;
    const avgSeconds = Math.floor(s.totalSeconds / s.count);
    const successRate = Math.round((s.successCount / s.count) * 100);
    console.log(
      cmd.padEnd(12) +
        s.count.toString().padEnd(10) +
        formatDuration(s.totalSeconds).padEnd(14) +
        formatDuration(avgSeconds).padEnd(14) +
        `${successRate}%`
    );
  }

  console.log("─".repeat(60));
  console.log(`\nTotal operations: ${entries.length}`);
  console.log(`\nUse 'dock analytics --last' to see recent operations`);
  console.log(`Use 'dock analytics --all' to see all operations`);
}
