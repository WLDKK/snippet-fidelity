import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig, resolvePageUrl, validateConfig } from "../src/config.js";

describe("configuration", () => {
  it("validates a source-aware page", () => {
    const config = validateConfig({
      version: 1,
      baseUrl: "https://docs.example.test/root/",
      pages: [
        {
          url: "guide/",
          checks: [
            {
              id: "install",
              button: "#copy",
              expected: { text: "pnpm install" },
              probe: "both",
            },
          ],
        },
      ],
    });
    expect(resolvePageUrl(config, config.pages[0]!)).toBe("https://docs.example.test/root/guide/");
  });

  it("rejects relative pages without a base URL", () => {
    expect(() => validateConfig({ version: 1, pages: [{ url: "/guide", discover: {} }] })).toThrow(
      /relative page URLs require/,
    );
  });

  it("rejects ambiguous page modes and duplicate IDs", () => {
    expect(() =>
      validateConfig({
        version: 1,
        pages: [{ url: "https://example.test", checks: [], discover: {} }],
      }),
    ).toThrow(/exactly one/);

    expect(() =>
      validateConfig({
        version: 1,
        pages: [
          {
            url: "https://example.test",
            checks: [
              { id: "same", button: "#a", expected: { text: "a" } },
              { id: "same", button: "#b", expected: { text: "b" } },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate check id/);
  });

  it("loads UTF-8 JSON with a byte-order mark", async () => {
    const directory = await mkdtemp(join(tmpdir(), "snippet-fidelity-config-"));
    const path = join(directory, "config.json");
    await writeFile(
      path,
      `\uFEFF${JSON.stringify({
        version: 1,
        pages: [{ url: "https://example.test", discover: {} }],
      })}`,
      "utf8",
    );
    const loaded = await loadConfig(path);
    expect(loaded.config.version).toBe(1);
    expect(loaded.directory).toBe(directory);
  });
});
