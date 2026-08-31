# Changelog

All notable changes will be documented in this file.

## [Unreleased]

### Changed

- CI now verifies the CLI and library on both Node.js 22 and 24, and development Node types match
  the minimum supported runtime line.
- The composite Action reuses a lockfile-keyed pnpm store cache when GitHub's cache service is
  available while continuing to install its locked dependencies and Chromium in an isolated action
  directory.
- Compatibility documentation now distinguishes the standalone Node.js range from the Action's
  provisioned runtime and identifies Chromium as the only browser supported in the current line.

## [0.3.0] - 2026-08-30

### Added

- GitHub Actions now publish a Markdown job summary and escaped error annotations for every
  non-passing fidelity check, with an opt-out input for callers that want file-only reports.
- The composite Action exposes outcome and check-count outputs, keeps audit exit codes authoritative
  when GitHub UI files are unavailable, and pins internal actions to immutable commits.
- A zero-configuration URL reconnaissance example, hosted JSON Schema, and automated dependency
  maintenance improve onboarding and long-term reliability.

## [0.2.0] - 2026-08-26

### Added

- A reusable composite GitHub Action with Markdown, JSON, and JUnit report output.
- A positive end-to-end Action smoke check in CI.
- A clean consumer-install verification for release archives.

### Changed

- npm is now the primary installation path.
- Compiled output is committed and checked in CI so tagged Action revisions are self-contained.
- The competitor ledger now covers Doc Detective, Playwright Clipboard, and custom Playwright tests.
- Automatic discovery ignores hidden code blocks and copy controls, preventing false errors from
  inactive tabs and responsive duplicate markup.
- Copy probes activate the discovered control directly so hover-only controls and unrelated visual
  overlap do not masquerade as clipboard-fidelity failures.
- npm package metadata uses the canonical executable path, and release verification now requires an
  installed `.bin` shim so a missing CLI command blocks publication.

## [0.1.0] - 2026-08-26

### Added

- Source-aware explicit checks using inline text, UTF-8 files, or rendered selectors.
- Rendered-DOM discovery for copy controls near code blocks.
- Separate handler-payload and browser-clipboard observations.
- Unicode-aware fingerprints and categorized first-difference diagnostics.
- JSON, JUnit XML, and Markdown reports.
- Adversarial end-to-end fixture corpus.
- Bounded discovery retries for documentation controls rendered after the page load event.

[Unreleased]: https://github.com/WLDKK/snippet-fidelity/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/WLDKK/snippet-fidelity/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/WLDKK/snippet-fidelity/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/WLDKK/snippet-fidelity/releases/tag/v0.1.0
