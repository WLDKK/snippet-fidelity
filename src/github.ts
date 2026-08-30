import { appendFile } from "node:fs/promises";

import { renderMarkdown } from "./reporters/markdown.js";
import type { AuditReport, CheckResult, ProbeResult } from "./types.js";

export interface GitHubResultOptions {
  summaryPath: string | undefined;
  writeCommand: (value: string) => void;
}

function escapeCommandData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeCommandProperty(value: string): string {
  return escapeCommandData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function probeMessage(probe: ProbeResult): string {
  if (!probe.available) return `${probe.kind}: ${probe.error ?? "unavailable"}`;

  const comparison = probe.comparison;
  if (comparison === null) return `${probe.kind}: comparison unavailable`;
  if (comparison.exact) return `${probe.kind}: exact`;

  const findings = comparison.findings.map((finding) => finding.code).join(", ") || "mismatch";
  const difference = comparison.firstDifference;
  if (difference === null) return `${probe.kind}: ${findings}`;

  return (
    `${probe.kind}: ${findings}; first difference at line ${difference.expectedLine}, ` +
    `column ${difference.expectedColumn} (expected ${difference.expected?.codePoint ?? "EOF"}, ` +
    `actual ${difference.actual?.codePoint ?? "EOF"})`
  );
}

function checkMessage(check: CheckResult): string {
  if (check.error !== null) return check.error;
  return check.probes
    .filter((probe) => !probe.available || probe.comparison?.exact === false)
    .map(probeMessage)
    .join("; ");
}

export function renderGitHubAnnotations(report: AuditReport): string[] {
  return report.checks
    .filter((check) => check.status !== "passed")
    .map((check) => {
      const title = escapeCommandProperty(`Snippet Fidelity: ${check.id}`);
      const message = escapeCommandData(checkMessage(check) || `${check.status} check`);
      return `::error title=${title}::${message}\n`;
    });
}

export async function publishGitHubResult(
  report: AuditReport,
  options: GitHubResultOptions,
): Promise<void> {
  if (options.summaryPath !== undefined && options.summaryPath !== "") {
    await appendFile(options.summaryPath, `${renderMarkdown(report)}\n`, "utf8");
  }

  for (const annotation of renderGitHubAnnotations(report)) {
    options.writeCommand(annotation);
  }
}
