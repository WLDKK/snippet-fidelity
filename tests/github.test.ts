import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fingerprintText } from "../src/compare.js";
import { publishGitHubResult, renderGitHubAnnotations } from "../src/github.js";
import type { AuditReport } from "../src/types.js";

const report: AuditReport = {
  schemaVersion: 1,
  tool: { name: "snippet-fidelity", version: "0.2.0" },
  generatedAt: "2026-08-30T00:00:00.000Z",
  environment: {
    browser: "chromium",
    browserVersion: "1",
    node: "v24",
    platform: "linux",
    architecture: "x64",
  },
  summary: { total: 2, passed: 1, failed: 1, errors: 0 },
  checks: [
    {
      id: "passes",
      pageUrl: "https://docs.example.test/",
      buttonSelector: "#copy-good",
      status: "passed",
      expected: { source: "canonical-text", fingerprint: fingerprintText("good") },
      probes: [
        {
          kind: "browser-clipboard",
          available: true,
          fingerprint: fingerprintText("good"),
          comparison: { exact: true, findings: [], firstDifference: null },
          error: null,
        },
      ],
      error: null,
      durationMs: 10,
    },
    {
      id: "newline:check,one%",
      pageUrl: "https://docs.example.test/",
      buttonSelector: "#copy-bad",
      status: "failed",
      expected: { source: "canonical-text", fingerprint: fingerprintText("run") },
      probes: [
        {
          kind: "browser-clipboard",
          available: true,
          fingerprint: fingerprintText("run\n"),
          comparison: {
            exact: false,
            findings: [
              {
                code: "terminal-line-breaks-changed",
                message: "Terminal line-break count changed.",
              },
            ],
            firstDifference: {
              codePointIndex: 3,
              expectedLine: 1,
              expectedColumn: 4,
              expected: null,
              actual: { escaped: "\\n", codePoint: "U+000A" },
              expectedContext: "run",
              actualContext: "run\\n",
            },
          },
          error: null,
        },
      ],
      error: null,
      durationMs: 12,
    },
  ],
};

describe("GitHub result integration", () => {
  it("renders one escaped error annotation per non-passing check", () => {
    expect(renderGitHubAnnotations(report)).toEqual([
      "::error title=Snippet Fidelity%3A newline%3Acheck%2Cone%25::" +
        "browser-clipboard: terminal-line-breaks-changed; first difference at line 1, " +
        "column 4 (expected EOF, actual U+000A)\n",
    ]);
  });

  it("appends the Markdown report to the GitHub step summary", async () => {
    const directory = await mkdtemp(join(tmpdir(), "snippet-fidelity-github-"));
    const summaryPath = join(directory, "summary.md");
    const outputPath = join(directory, "output.txt");
    const commands: string[] = [];

    const warnings = await publishGitHubResult(report, {
      summaryPath,
      outputPath,
      writeCommand: (value) => commands.push(value),
    });

    const summary = await readFile(summaryPath, "utf8");
    const output = await readFile(outputPath, "utf8");
    expect(summary).toContain("# Snippet Fidelity report");
    expect(summary).toContain("| 2 | 1 | 1 | 0 |");
    expect(output).toContain("outcome=failed\n");
    expect(output).toContain("passed=1\n");
    expect(output).toContain("failed=1\n");
    expect(commands).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it("keeps annotations available when the summary file cannot be written", async () => {
    const directory = await mkdtemp(join(tmpdir(), "snippet-fidelity-github-"));
    const commands: string[] = [];

    const warnings = await publishGitHubResult(report, {
      summaryPath: directory,
      outputPath: undefined,
      writeCommand: (value) => commands.push(value),
    });

    expect(commands).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("could not write the GitHub job summary");
  });
});
