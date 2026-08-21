import { describe, expect, it } from "vitest";

import { compareText, fingerprintText } from "../src/compare.js";

describe("compareText", () => {
  it("accepts exact Unicode text", () => {
    const result = compareText("printf '你好 👋'", "printf '你好 👋'");
    expect(result).toEqual({ exact: true, findings: [], firstDifference: null });
  });

  it("classifies terminal line-break changes", () => {
    const result = compareText("npm install safe-package", "npm install safe-package\n");
    expect(result.exact).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "terminal-line-breaks-changed",
    );
    expect(result.firstDifference?.actual?.codePoint).toBe("U+000A");
  });

  it("classifies line-ending encoding changes", () => {
    const result = compareText("first\r\nsecond", "first\nsecond");
    expect(result.findings.map((finding) => finding.code)).toContain("line-endings-changed");
  });

  it("classifies indentation and tab substitution", () => {
    const indentation = compareText("if (ready) {\n\tlaunch();\n}", "if (ready) {\nlaunch();\n}");
    expect(indentation.findings.map((finding) => finding.code)).toContain("indentation-changed");

    const tabs = compareText("root\n\tchild", "root\n    child");
    expect(tabs.findings.map((finding) => finding.code)).toContain("tabs-spaces-changed");
  });

  it("classifies Unicode normalization without collapsing it", () => {
    const result = compareText("café", "cafe\u0301");
    expect(result.exact).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "unicode-normalization-changed",
    );
  });

  it("reports changed invisible characters", () => {
    const result = compareText("const token = 1", "const to\u200bken = 1");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "invisible-characters-changed",
    );
    expect(result.findings[0]?.message).toMatch(/U\+200B/);
  });

  it("classifies smart and full-width punctuation", () => {
    const result = compareText('echo "safe"', "echo “safe”");
    expect(result.findings.map((finding) => finding.code)).toContain(
      "punctuation-width-or-style-changed",
    );
  });
});

describe("fingerprintText", () => {
  it("reports bytes, code points, line endings, and trailing newline", () => {
    const fingerprint = fingerprintText("你\r\n好\n");
    expect(fingerprint.codePoints).toBe(5);
    expect(fingerprint.utf8Bytes).toBe(9);
    expect(fingerprint.lines).toBe(3);
    expect(fingerprint.hasTrailingLineBreak).toBe(true);
    expect(fingerprint.lineEndings).toEqual({ crlf: 1, lf: 1, cr: 0 });
    expect(fingerprint.sha256).toHaveLength(64);
  });
});
