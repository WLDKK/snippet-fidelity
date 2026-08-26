# Changelog

All notable changes will be documented in this file.

## [Unreleased]

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

[Unreleased]: https://github.com/WLDKK/snippet-fidelity/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/WLDKK/snippet-fidelity/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/WLDKK/snippet-fidelity/releases/tag/v0.1.0
