# Snippet Fidelity

[![CI](https://github.com/WLDKK/snippet-fidelity/actions/workflows/ci.yml/badge.svg)](https://github.com/WLDKK/snippet-fidelity/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/WLDKK/snippet-fidelity)](https://github.com/WLDKK/snippet-fidelity/releases)
[![npm](https://img.shields.io/npm/v/snippet-fidelity)](https://www.npmjs.com/package/snippet-fidelity)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Snippet Fidelity checks whether a rendered documentation site's **Copy code** controls preserve the
text maintainers intended to ship.

It drives a real Chromium page, clicks a real copy control, records the
`navigator.clipboard.writeText` payload when available, reads the browser clipboard, and compares
both observations at Unicode code-point precision. It detects changes such as terminal newlines,
indentation loss, tab/space substitution, invisible characters, punctuation substitution, and
Unicode normalization.

> Project status: public pre-release (`v0.2.0`). The evidence model is usable, but the API may
> change while the conformance contract is being validated.

## Why this is different

Markdown linters inspect source. Documentation test runners execute examples. Clipboard libraries
implement copy behavior. Snippet Fidelity tests a different boundary:

```text
canonical snippet -> rendered page -> copy handler -> browser clipboard
```

Reports do not include full expected or copied text by default. They contain SHA-256 fingerprints,
lengths, categorized findings, and a bounded escaped context around the first difference.

For broad documentation procedure, UI, API, or executable-example testing, use a general framework
such as [Doc Detective](https://github.com/doc-detective/doc-detective). For low-level clipboard
fixtures inside an existing Playwright suite, consider
[Playwright Clipboard](https://github.com/vrknetha/playwright-clipboard). Snippet Fidelity stays
narrow: reusable source-to-copy evidence for rendered documentation code blocks.

## Evidence levels

Snippet Fidelity labels evidence instead of presenting every check as equivalent:

- `canonical-text`: expected text is declared directly in configuration.
- `canonical-file`: expected text is loaded byte-for-byte as UTF-8 from a repository file.
- `rendered-dom`: expected text comes from the rendered `<code>` element. This proves DOM-to-copy
  fidelity, not source-to-render fidelity.

Use an explicit configuration for release gates. Direct URL discovery is useful for reconnaissance
and regression triage.

## Quick start

Requirements: Node.js 22 or newer and Chromium. Install the package and browser:

```shell
npm install --save-dev snippet-fidelity
npx playwright install chromium
npx snippet-fidelity audit https://docs.example.com/
```

The versioned GitHub release archive remains available when registry installation is unsuitable.

To run from a cloned checkout instead:

```shell
pnpm install
pnpm exec playwright install chromium
pnpm build
node dist/cli.js audit https://docs.example.com/
```

Direct URL mode searches for accessible copy controls near `<pre><code>` blocks and prints a
Markdown report.

For source-aware checks, create `snippet-fidelity.config.json`:

```json
{
  "$schema": "./node_modules/snippet-fidelity/schema/config.schema.json",
  "version": 1,
  "baseUrl": "https://docs.example.com/",
  "pages": [
    {
      "url": "getting-started/",
      "checks": [
        {
          "id": "install-command",
          "button": "#install-command button[aria-label='Copy code']",
          "expected": { "file": "./snippets/install.sh" },
          "probe": "both"
        }
      ]
    }
  ]
}
```

Then write CI-friendly reports:

```shell
node dist/cli.js audit --config snippet-fidelity.config.json \
  --reporter markdown --reporter json --reporter junit \
  --output-dir artifacts
```

## GitHub Action

Use the repository directly as a merge gate after committing a source-aware configuration:

```yaml
- uses: actions/checkout@v4
- uses: WLDKK/snippet-fidelity@v0
  with:
    config: snippet-fidelity.config.json
    output-dir: artifacts/snippet-fidelity
```

See the [GitHub Action guide](docs/github-action.md) for inputs, report upload, failure behavior,
and pinning guidance.

On PowerShell, put the command on one line or use PowerShell's backtick continuation character.

## Probe modes

- `clipboard` (default): the browser clipboard must match.
- `handler`: the captured `navigator.clipboard.writeText` argument must match. This is useful when a
  runtime cannot expose clipboard read permission, but it does not prove an OS clipboard round-trip.
- `both`: both observations must exist and match.

Checks run sequentially because the clipboard is shared mutable state. A selector must match exactly
one button; ambiguous selectors fail safely.

## Exit codes

- `0`: every required probe passed.
- `1`: at least one fidelity check failed or encountered a page/probe error.
- `2`: invalid arguments, configuration, or tool startup failure.

## What it does not do

- It never executes copied commands or code.
- It does not rewrite, normalize, or "fix" clipboard content.
- It is not a generic clipboard manager or Clipboard API conformance suite.
- It does not claim source fidelity when expected text came from the rendered DOM.
- It does not click arbitrary page controls; discovery is limited to copy-named controls near
  matching code blocks.

## Current limitations

- Chromium is the only supported browser in `0.1.x`.
- Copy implementations that do not use `navigator.clipboard.writeText` can still be tested through
  the browser clipboard, but will not produce a handler-payload observation.
- Source files are read as exact UTF-8 text. A final newline in the file is part of the contract.
- Browser and operating-system clipboard layers may themselves transform line endings. That is
  reported as observed rather than normalized away.
- Automatic discovery uses heuristics. Explicit selectors are required for a dependable release
  gate.

## Development

```shell
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
npm pack --dry-run
```

`pnpm verify` runs the complete local gate. The end-to-end tests serve an adversarial fixture site
containing one correct copy control and five intentional regressions.

To inspect the fixture manually, run `pnpm fixture` in one terminal and then run:

```shell
node dist/cli.js audit --config examples/adversarial-fixture.config.json
```

The expected result is one pass and five failures; a zero exit code would mean the fixture stopped
testing the intended regressions.

See [architecture](docs/architecture.md), [threat model](docs/threat-model.md),
[contribution guide](CONTRIBUTING.md), and the dated [competitor ledger](docs/competitor-ledger.md)
for the project's scope and evidence.

## License

MIT
