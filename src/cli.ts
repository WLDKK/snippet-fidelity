#!/usr/bin/env node

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { audit } from "./audit.js";
import { loadConfig, validateConfig } from "./config.js";
import { publishGitHubResult } from "./github.js";
import {
  isReporterName,
  renderJson,
  renderJunit,
  renderMarkdown,
  type ReporterName,
  writeReports,
} from "./reporters/index.js";
import type { AuditConfig, AuditReport } from "./types.js";
import { TOOL_VERSION } from "./version.js";

interface CliIo {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

const DEFAULT_IO: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

const USAGE = `Snippet Fidelity ${TOOL_VERSION}

Usage:
  snippet-fidelity audit --config <file> [options]
  snippet-fidelity audit <url> [options]

Options:
  -c, --config <file>       Source-aware JSON configuration
  -o, --output-dir <dir>   Write reports to this directory
      --reporter <name>    markdown, json, or junit (repeatable)
      --headed             Show the Chromium window
      --timeout <ms>       Override the default timeout
  -h, --help               Show help
      --version            Show version

Direct URL mode uses rendered-DOM discovery. A configuration with expected text
or files is required for source-to-clipboard evidence.
`;

function parseTimeout(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout <= 0 || timeout > 120_000) {
    throw new Error("--timeout must be an integer from 1 to 120000");
  }
  return timeout;
}

function parseReporters(values: string[] | undefined): ReporterName[] {
  const requested = values ?? ["markdown"];
  const invalid = requested.filter((value) => !isReporterName(value));
  if (invalid.length > 0) {
    throw new Error(`Unknown reporter(s): ${invalid.join(", ")}`);
  }
  return [...new Set(requested as ReporterName[])];
}

function renderReport(report: AuditReport, reporter: ReporterName): string {
  if (reporter === "json") return renderJson(report);
  if (reporter === "junit") return renderJunit(report);
  return renderMarkdown(report);
}

function applyBrowserOverrides(
  config: AuditConfig,
  headed: boolean,
  timeoutMs: number | undefined,
): AuditConfig {
  const browser = { ...config.browser };
  if (headed) browser.headless = false;
  if (timeoutMs !== undefined) browser.timeoutMs = timeoutMs;
  return { ...config, browser };
}

function summaryLine(report: AuditReport): string {
  return (
    `Snippet Fidelity: ${report.summary.passed}/${report.summary.total} passed, ` +
    `${report.summary.failed} failed, ${report.summary.errors} errors.\n`
  );
}

export async function runCli(args: string[], io: CliIo = DEFAULT_IO): Promise<number> {
  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        config: { type: "string", short: "c" },
        "output-dir": { type: "string", short: "o" },
        reporter: { type: "string", multiple: true },
        headed: { type: "boolean", default: false },
        timeout: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", default: false },
      },
    });

    if (parsed.values.version) {
      io.stdout(`${TOOL_VERSION}\n`);
      return 0;
    }
    if (parsed.values.help) {
      io.stdout(USAGE);
      return 0;
    }
    if (parsed.positionals[0] !== "audit") {
      throw new Error('Expected the "audit" command.');
    }

    const url = parsed.positionals[1];
    if (parsed.positionals.length > 2) throw new Error("Too many positional arguments.");
    if ((parsed.values.config === undefined) === (url === undefined)) {
      throw new Error("Provide exactly one of --config <file> or a URL.");
    }

    const timeoutMs = parseTimeout(parsed.values.timeout);
    const reporters = parseReporters(parsed.values.reporter);
    if (parsed.values["output-dir"] === undefined && reporters.length > 1) {
      throw new Error("Multiple reporters require --output-dir.");
    }

    let config: AuditConfig;
    let configDirectory = process.cwd();
    if (parsed.values.config !== undefined) {
      const loaded = await loadConfig(parsed.values.config);
      config = loaded.config;
      configDirectory = loaded.directory;
    } else {
      config = validateConfig({
        version: 1,
        pages: [{ url, discover: {} }],
      });
    }
    config = applyBrowserOverrides(config, parsed.values.headed, timeoutMs);

    const report = await audit(config, { configDirectory });
    const outputDirectory = parsed.values["output-dir"];
    if (outputDirectory === undefined) {
      io.stdout(renderReport(report, reporters[0] ?? "markdown"));
    } else {
      const paths = await writeReports(report, outputDirectory, reporters);
      io.stdout(summaryLine(report));
      for (const path of paths) io.stdout(`Report: ${path}\n`);
    }
    if (process.env.SNIPPET_FIDELITY_GITHUB_SUMMARY === "true") {
      await publishGitHubResult(report, {
        summaryPath: process.env.GITHUB_STEP_SUMMARY,
        writeCommand: io.stdout,
      });
    }
    return report.summary.failed > 0 || report.summary.errors > 0 ? 1 : 0;
  } catch (error) {
    io.stderr(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    io.stderr("Run snippet-fidelity --help for usage.\n");
    return 2;
  }
}

const directEntry =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (directEntry) {
  process.exitCode = await runCli(process.argv.slice(2));
}
