function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
function checkMessage(check) {
    if (check.error !== null)
        return check.error;
    return check.probes
        .filter((probe) => !probe.available || probe.comparison?.exact === false)
        .flatMap((probe) => {
        if (!probe.available)
            return [`${probe.kind}: ${probe.error ?? "unavailable"}`];
        return probe.comparison?.findings.map((finding) => `${probe.kind}: ${finding.message}`) ?? [];
    })
        .join("\n");
}
function renderCase(check) {
    const attributes = `name="${escapeXml(check.id)}" ` +
        `classname="snippet-fidelity" time="${(check.durationMs / 1000).toFixed(3)}"`;
    if (check.status === "passed")
        return `  <testcase ${attributes} />`;
    const tag = check.status === "error" ? "error" : "failure";
    const message = checkMessage(check);
    return [
        `  <testcase ${attributes}>`,
        `    <${tag} message="${escapeXml(message.split("\n")[0] ?? check.status)}">${escapeXml(message)}</${tag}>`,
        "  </testcase>",
    ].join("\n");
}
export function renderJunit(report) {
    const duration = report.checks.reduce((total, check) => total + check.durationMs, 0) / 1000;
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuite name="snippet-fidelity" tests="${report.summary.total}" failures="${report.summary.failed}" errors="${report.summary.errors}" time="${duration.toFixed(3)}">`,
        ...report.checks.map(renderCase),
        "</testsuite>",
        "",
    ].join("\n");
}
//# sourceMappingURL=junit.js.map