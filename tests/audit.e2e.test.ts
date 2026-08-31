import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { audit } from "../src/audit.js";
import { validateConfig } from "../src/config.js";
import type { CheckStatus } from "../src/types.js";
import { fixtureRoot, startFixtureServer, type FixtureServer } from "./helpers/fixture-server.js";

interface CorpusEntry {
  source: string;
  transform: string;
}

let server: FixtureServer;
let corpus: Record<string, CorpusEntry>;

beforeAll(async () => {
  server = await startFixtureServer();
  corpus = JSON.parse(await readFile(join(fixtureRoot, "corpus.json"), "utf8")) as Record<
    string,
    CorpusEntry
  >;
});

afterAll(async () => {
  await server.close();
});

function expectedStatus(id: string): CheckStatus {
  return id === "good-unicode" ? "passed" : "failed";
}

describe("browser audit", () => {
  it("compares configured canonical sources with both probe layers", async () => {
    const config = validateConfig({
      version: 1,
      baseUrl: server.baseUrl,
      browser: { timeoutMs: 5_000 },
      pages: [
        {
          url: "/",
          checks: Object.entries(corpus).map(([id, fixture]) => ({
            id,
            button: `#copy-${id}`,
            expected: { text: fixture.source },
            probe: "both",
          })),
        },
      ],
    });

    const report = await audit(config);
    expect(report.summary).toEqual({ total: 6, passed: 1, failed: 5, errors: 0 });
    for (const check of report.checks) {
      expect(check.status).toBe(expectedStatus(check.id));
      expect(check.expected?.source).toBe("canonical-text");
      expect(check.probes).toHaveLength(2);
      expect(check.probes.every((probe) => probe.available)).toBe(true);
      expect(check.evidenceGraph).toMatchObject({ version: 1, baseline: "canonical-source" });
      expect(check.evidenceGraph?.nodes).toHaveLength(4);
      expect(check.evidenceGraph?.comparisons).toHaveLength(6);
    }

    const findings = Object.fromEntries(
      report.checks.map((check) => [
        check.id,
        check.probes
          .find((probe) => probe.kind === "handler-payload")
          ?.comparison?.findings.map((finding) => finding.code) ?? [],
      ]),
    );
    expect(findings["trailing-newline"]).toContain("terminal-line-breaks-changed");
    expect(findings["indentation-loss"]).toContain("indentation-changed");
    expect(findings["tabs-to-spaces"]).toContain("tabs-spaces-changed");
    expect(findings["zero-width-injection"]).toContain("invisible-characters-changed");
    expect(findings["unicode-normalization"]).toContain("unicode-normalization-changed");
  });

  it("discovers nearby accessible copy buttons using rendered DOM evidence", async () => {
    const config = validateConfig({
      version: 1,
      pages: [
        {
          url: `${server.baseUrl}?renderDelayMs=200`,
          discover: { probe: "both" },
        },
      ],
    });
    const report = await audit(config);
    expect(report.summary).toEqual({ total: 6, passed: 1, failed: 5, errors: 0 });
    expect(report.checks.map((check) => check.id)).toEqual(Object.keys(corpus));
    expect(report.checks.every((check) => check.expected?.source === "rendered-dom")).toBe(true);
    expect(report.checks.every((check) => check.evidenceGraph?.baseline === "rendered-dom")).toBe(
      true,
    );
  });

  it("ignores copy controls inside hidden code blocks", async () => {
    const config = validateConfig({
      version: 1,
      pages: [{ url: server.baseUrl, discover: {} }],
    });

    const report = await audit(config);

    expect(report.checks).toHaveLength(Object.keys(corpus).length);
    expect(report.checks.map((check) => check.id)).toEqual(Object.keys(corpus));
  });
});
