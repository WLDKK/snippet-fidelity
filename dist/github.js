import { appendFile } from "node:fs/promises";
import { renderMarkdown } from "./reporters/markdown.js";
function escapeCommandData(value) {
    return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function escapeCommandProperty(value) {
    return escapeCommandData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
function probeMessage(probe) {
    if (!probe.available)
        return `${probe.kind}: ${probe.error ?? "unavailable"}`;
    const comparison = probe.comparison;
    if (comparison === null)
        return `${probe.kind}: comparison unavailable`;
    if (comparison.exact)
        return `${probe.kind}: exact`;
    const findings = comparison.findings.map((finding) => finding.code).join(", ") || "mismatch";
    const difference = comparison.firstDifference;
    if (difference === null)
        return `${probe.kind}: ${findings}`;
    return (`${probe.kind}: ${findings}; first difference at line ${difference.expectedLine}, ` +
        `column ${difference.expectedColumn} (expected ${difference.expected?.codePoint ?? "EOF"}, ` +
        `actual ${difference.actual?.codePoint ?? "EOF"})`);
}
function checkMessage(check) {
    if (check.error !== null)
        return check.error;
    return check.probes
        .filter((probe) => !probe.available || probe.comparison?.exact === false)
        .map(probeMessage)
        .join("; ");
}
export function renderGitHubAnnotations(report) {
    return report.checks
        .filter((check) => check.status !== "passed")
        .map((check) => {
        const title = escapeCommandProperty(`Snippet Fidelity: ${check.id}`);
        const message = escapeCommandData(checkMessage(check) || `${check.status} check`);
        return `::error title=${title}::${message}\n`;
    });
}
export async function publishGitHubResult(report, options) {
    if (options.summaryPath !== undefined && options.summaryPath !== "") {
        await appendFile(options.summaryPath, `${renderMarkdown(report)}\n`, "utf8");
    }
    for (const annotation of renderGitHubAnnotations(report)) {
        options.writeCommand(annotation);
    }
}
//# sourceMappingURL=github.js.map