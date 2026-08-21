import { describe, expect, it } from "vitest";

import { fingerprintText } from "../src/compare.js";
import { renderJson, renderJunit, renderMarkdown } from "../src/reporters/index.js";
import type { AuditReport } from "../src/types.js";

const report: AuditReport = {
  schemaVersion: 1,
  tool: { name: "snippet-fidelity", version: "0.1.0" },
  generatedAt: "2026-08-21T00:00:00.000Z",
  environment: {
    browser: "chromium",
    browserVersion: "1",
    node: "v24",
    platform: "win32",
    architecture: "x64",
  },
  summary: { total: 1, passed: 0, failed: 1, errors: 0 },
  checks: [
    {
      id: "newline",
      pageUrl: "https://docs.example.test/",
      buttonSelector: "#copy",
      status: "failed",
      expected: { source: "canonical-text", fingerprint: fingerprintText("secret-example") },
      probes: [
        {
          kind: "browser-clipboard",
          available: true,
          fingerprint: fingerprintText("secret-example\n"),
          comparison: {
            exact: false,
            findings: [
              {
                code: "terminal-line-breaks-changed",
                message: "Terminal line-break count changed.",
              },
            ],
            firstDifference: null,
          },
          error: null,
        },
      ],
      error: null,
      durationMs: 25,
    },
  ],
};

describe("reporters", () => {
  it("renders machine-readable JSON without raw snippet text", () => {
    const output = renderJson(report);
    expect(JSON.parse(output).summary.failed).toBe(1);
    expect(output).not.toContain("secret-example");
  });

  it("renders Markdown details", () => {
    const output = renderMarkdown(report);
    expect(output).toContain("| 1 | 0 | 1 | 0 |");
    expect(output).toContain("terminal-line-breaks-changed");
  });

  it("renders valid JUnit-shaped XML", () => {
    const output = renderJunit(report);
    expect(output).toContain('<testsuite name="snippet-fidelity" tests="1" failures="1"');
    expect(output).toContain("<failure");
    expect(output).toContain("</testsuite>");
  });
});
