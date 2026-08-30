import { appendFile } from "node:fs/promises";

import { renderMarkdown } from "./reporters/markdown.js";
import type { AuditReport, CheckResult, ProbeResult } from "./types.js";

export interface GitHubResultOptions {
  summaryPath: string | undefined;
  outputPath: string | undefined;
  writeCommand: ((value: string) => void) | undefined;
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
): Promise<string[]> {
  const warnings: string[] = [];

  if (options.outputPath !== undefined && options.outputPath !== "") {
    const outcome = report.summary.failed > 0 || report.summary.errors > 0 ? "failed" : "passed";
    const output = [
      `outcome=${outcome}`,
      `total=${report.summary.total}`,
      `passed=${report.summary.passed}`,
      `failed=${report.summary.failed}`,
      `errors=${report.summary.errors}`,
      "",
    ].join("\n");
    try {
      await appendFile(options.outputPath, output, "utf8");
    } catch (error) {
      warnings.push(
        `could not write GitHub Action outputs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (options.writeCommand !== undefined) {
    for (const annotation of renderGitHubAnnotations(report)) {
      try {
        options.writeCommand(annotation);
      } catch (error) {
        warnings.push(
          `could not write a GitHub annotation: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  if (options.summaryPath !== undefined && options.summaryPath !== "") {
    try {
      await appendFile(options.summaryPath, `${renderMarkdown(report)}\n`, "utf8");
    } catch (error) {
      warnings.push(
        `could not write the GitHub job summary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return warnings;
}
