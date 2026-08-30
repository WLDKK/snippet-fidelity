import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const reportPath = resolve(process.argv[2] ?? "artifacts/action-smoke/snippet-fidelity.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));

if (
  report.tool?.name !== "snippet-fidelity" ||
  report.tool?.version !== "0.3.0" ||
  report.summary?.total !== 1 ||
  report.summary?.passed !== 1 ||
  report.summary?.failed !== 0 ||
  report.summary?.errors !== 0 ||
  report.checks?.[0]?.expected?.source !== "canonical-text" ||
  report.checks?.[0]?.probes?.length !== 2 ||
  !report.checks[0].probes.every((probe) => probe.available)
) {
  throw new Error(`Unexpected action smoke report: ${JSON.stringify(report.summary)}`);
}

if (process.env.GITHUB_ACTIONS === "true") {
  const outputs = {
    reportDirectory: process.env.SNIPPET_FIDELITY_REPORT_DIRECTORY,
    outcome: process.env.SNIPPET_FIDELITY_OUTCOME,
    total: process.env.SNIPPET_FIDELITY_TOTAL,
    passed: process.env.SNIPPET_FIDELITY_PASSED,
    failed: process.env.SNIPPET_FIDELITY_FAILED,
    errors: process.env.SNIPPET_FIDELITY_ERRORS,
  };
  const expected = {
    reportDirectory: "artifacts/action-smoke",
    outcome: "passed",
    total: "1",
    passed: "1",
    failed: "0",
    errors: "0",
  };
  if (JSON.stringify(outputs) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected action outputs: ${JSON.stringify(outputs)}`);
  }
}

process.stdout.write(`Verified GitHub Action report at ${reportPath}.\n`);
