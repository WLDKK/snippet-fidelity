import type { AuditReport, CheckResult } from "../types.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function checkMessage(check: CheckResult): string {
  if (check.error !== null) return check.error;
  if (check.evidenceGraph !== null && check.evidenceGraph !== undefined) {
    return check.evidenceGraph.comparisons
      .filter((comparison) => comparison.required && comparison.status !== "exact")
      .flatMap((comparison) => {
        const label = `${comparison.from} -> ${comparison.to}`;
        if (comparison.status === "not-comparable") {
          return [`${label}: ${comparison.detail ?? "not comparable"}`];
        }
        return (
          comparison.comparison?.findings.map((finding) => `${label}: ${finding.message}`) ?? [
            `${label}: mismatch`,
          ]
        );
      })
      .join("\n");
  }
  return check.probes
    .filter((probe) => !probe.available || probe.comparison?.exact === false)
    .flatMap((probe) => {
      if (!probe.available) return [`${probe.kind}: ${probe.error ?? "unavailable"}`];
      return probe.comparison?.findings.map((finding) => `${probe.kind}: ${finding.message}`) ?? [];
    })
    .join("\n");
}

function renderCase(check: CheckResult): string {
  const attributes =
    `name="${escapeXml(check.id)}" ` +
    `classname="snippet-fidelity" time="${(check.durationMs / 1000).toFixed(3)}"`;
  if (check.status === "passed") return `  <testcase ${attributes} />`;
  const tag = check.status === "error" ? "error" : "failure";
  const message = checkMessage(check);
  return [
    `  <testcase ${attributes}>`,
    `    <${tag} message="${escapeXml(message.split("\n")[0] ?? check.status)}">${escapeXml(message)}</${tag}>`,
    "  </testcase>",
  ].join("\n");
}

export function renderJunit(report: AuditReport): string {
  const duration = report.checks.reduce((total, check) => total + check.durationMs, 0) / 1000;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="snippet-fidelity" tests="${report.summary.total}" failures="${report.summary.failed}" errors="${report.summary.errors}" time="${duration.toFixed(3)}">`,
    ...report.checks.map(renderCase),
    "</testsuite>",
    "",
  ].join("\n");
}
