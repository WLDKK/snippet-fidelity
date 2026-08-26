import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const reportPath = resolve(process.argv[2] ?? "artifacts/action-smoke/snippet-fidelity.json");
const report = JSON.parse(await readFile(reportPath, "utf8"));

if (
  report.tool?.name !== "snippet-fidelity" ||
  report.tool?.version !== "0.2.0" ||
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

process.stdout.write(`Verified GitHub Action report at ${reportPath}.\n`);
