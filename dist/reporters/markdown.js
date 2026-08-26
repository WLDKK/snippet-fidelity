function escapeCell(value) {
    return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function probeDetails(probe) {
    if (!probe.available)
        return [`${probe.kind}: unavailable (${probe.error ?? "unknown error"})`];
    if (probe.comparison?.exact === true)
        return [`${probe.kind}: exact`];
    const findings = probe.comparison?.findings.map((finding) => finding.code).join(", ") ?? "mismatch";
    const difference = probe.comparison?.firstDifference;
    const lines = [`${probe.kind}: ${findings}`];
    if (difference !== null && difference !== undefined) {
        lines.push(`first difference at code point ${difference.codePointIndex} ` +
            `(line ${difference.expectedLine}, column ${difference.expectedColumn}); ` +
            `expected ${difference.expected?.codePoint ?? "EOF"}, actual ${difference.actual?.codePoint ?? "EOF"}`);
        lines.push(`expected context: ${difference.expectedContext}`);
        lines.push(`actual context: ${difference.actualContext}`);
    }
    return lines;
}
function checkDetails(check) {
    if (check.error !== null)
        return [check.error];
    return check.probes.flatMap(probeDetails);
}
export function renderMarkdown(report) {
    const lines = [
        "# Snippet Fidelity report",
        "",
        `Generated: ${report.generatedAt}`,
        "",
        `Chromium ${report.environment.browserVersion} on ${report.environment.platform}/${report.environment.architecture}`,
        "",
        "## Summary",
        "",
        "| Total | Passed | Failed | Errors |",
        "| ---: | ---: | ---: | ---: |",
        `| ${report.summary.total} | ${report.summary.passed} | ${report.summary.failed} | ${report.summary.errors} |`,
        "",
        "## Checks",
        "",
        "| Status | Check | Evidence | Page | Duration |",
        "| --- | --- | --- | --- | ---: |",
    ];
    for (const check of report.checks) {
        lines.push(`| ${check.status.toUpperCase()} | ${escapeCell(check.id)} | ${check.expected?.source ?? "none"} | ${escapeCell(check.pageUrl)} | ${check.durationMs} ms |`);
    }
    const nonPassing = report.checks.filter((check) => check.status !== "passed");
    if (nonPassing.length > 0) {
        lines.push("", "## Details");
        for (const check of nonPassing) {
            lines.push("", `### ${check.id}`, "");
            for (const detail of checkDetails(check))
                lines.push(`- ${detail}`);
        }
    }
    lines.push("");
    return lines.join("\n");
}
//# sourceMappingURL=markdown.js.map