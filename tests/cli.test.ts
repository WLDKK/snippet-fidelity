import { describe, expect, it } from "vitest";

import { runCli } from "../src/cli.js";

function captureIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: (value: string) => stdout.push(value),
      stderr: (value: string) => stderr.push(value),
    },
    stdout,
    stderr,
  };
}

describe("CLI", () => {
  it("prints its version without launching a browser", async () => {
    const capture = captureIo();
    expect(await runCli(["--version"], capture.io)).toBe(0);
    expect(capture.stdout.join("")).toBe("0.1.0\n");
    expect(capture.stderr).toEqual([]);
  });

  it("rejects ambiguous input", async () => {
    const capture = captureIo();
    expect(
      await runCli(["audit", "https://example.test", "--config", "config.json"], capture.io),
    ).toBe(2);
    expect(capture.stderr.join("")).toContain("exactly one");
  });
});
