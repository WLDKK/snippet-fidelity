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
function graphSummary(graph) {
    if (graph === null || graph === undefined)
        return "none";
    const availableNodes = graph.nodes.filter((node) => node.state === "available").length;
    const comparableEdges = graph.comparisons.filter((comparison) => comparison.status !== "not-comparable").length;
    return `${graph.baseline}; ${availableNodes}/${graph.nodes.length} nodes; ${comparableEdges}/${graph.comparisons.length} edges`;
}
function graphComparisonDetail(comparison) {
    const label = `${comparison.from} -> ${comparison.to}`;
    const requirement = comparison.required ? "required" : "informational";
    if (comparison.status === "not-comparable") {
        return `${label} (${requirement}): not comparable (${comparison.detail ?? "unknown reason"})`;
    }
    if (comparison.status === "exact")
        return `${label} (${requirement}): exact`;
    const findings = comparison.comparison?.findings.map((finding) => finding.code).join(", ") ?? "mismatch";
    return `${label} (${requirement}): ${findings}`;
}
function graphDetails(graph) {
    if (graph === null || graph === undefined)
        return [];
    const comparisons = graph.comparisons.filter((comparison) => comparison.required || comparison.status === "mismatch");
    return [`proof graph baseline: ${graph.baseline}`, ...comparisons.map(graphComparisonDetail)];
}
function checkDetails(check) {
    const error = check.error === null ? [] : [check.error];
    return [...error, ...check.probes.flatMap(probeDetails), ...graphDetails(check.evidenceGraph)];
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
        "| Status | Check | Evidence | Proof graph | Page | Duration |",
        "| --- | --- | --- | --- | --- | ---: |",
    ];
    for (const check of report.checks) {
        lines.push(`| ${check.status.toUpperCase()} | ${escapeCell(check.id)} | ${check.expected?.source ?? "none"} | ${escapeCell(graphSummary(check.evidenceGraph))} | ${escapeCell(check.pageUrl)} | ${check.durationMs} ms |`);
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