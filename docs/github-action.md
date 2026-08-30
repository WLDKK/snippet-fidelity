# GitHub Action

The repository includes a composite action for running source-aware clipboard checks as a merge
gate. A checked-in configuration is preferred because it can compare rendered and copied text with
canonical repository files.

## Fast reconnaissance

Use URL mode to inspect a public documentation page without checking out a repository or creating a
configuration file:

```yaml
- uses: WLDKK/snippet-fidelity@v0
  with:
    url: https://docs.example.com/
```

This compares the rendered code block with the observed copy payload. It is useful for discovery,
but it does not prove that the rendered block still matches repository source.

## Source-aware merge gate

```yaml
name: documentation-copy-fidelity

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: WLDKK/snippet-fidelity@v0
        with:
          config: snippet-fidelity.config.json
          output-dir: artifacts/snippet-fidelity
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: snippet-fidelity-report
          path: artifacts/snippet-fidelity
```

## Inputs

| Input            | Required | Default                   | Meaning                               |
| ---------------- | -------- | ------------------------- | ------------------------------------- |
| `config`         | one of   |                           | Source-aware JSON configuration path  |
| `url`            | one of   |                           | URL for rendered-DOM discovery        |
| `output-dir`     | no       | `snippet-fidelity-report` | Report destination                    |
| `reporters`      | no       | `markdown,json,junit`     | Comma-separated report formats        |
| `timeout`        | no       | tool default              | Per-operation timeout in milliseconds |
| `github-summary` | no       | `true`                    | Publish a job summary and annotations |

## Outputs

| Output             | Meaning                                     |
| ------------------ | ------------------------------------------- |
| `report-directory` | Directory containing generated report files |
| `outcome`          | `passed` or `failed`                        |
| `total`            | Total checks                                |
| `passed`           | Passing checks                              |
| `failed`           | Fidelity mismatches                         |
| `errors`           | Page, selector, or probe errors             |

Give the action step an `id` to consume these values later in the job:

```yaml
- id: snippet-fidelity
  uses: WLDKK/snippet-fidelity@v0
  with:
    url: https://docs.example.com/
- if: always()
  run: echo "${{ steps.snippet-fidelity.outputs.passed }} checks passed"
```

Exactly one of `config` and `url` is required. The action fails when a required probe reports a
mismatch or error, while still leaving reports in `output-dir` for an `if: always()` upload step. By
default, the same result is also rendered on the workflow summary page. Every failed or errored
check creates a GitHub error annotation containing the finding category and first differing code
point, without including the full copied snippet. Set `github-summary: false` to disable both UI
integrations. Structured outputs remain available when UI publishing is disabled. If GitHub's
summary file is unavailable, the action emits a warning while preserving the audit's own exit code.

The moving `v0` tag receives backward-compatible pre-1.0 updates. Pin the action to a full commit
SHA when your supply-chain policy requires immutable dependencies.

The action installs the repository's locked production dependencies and Chromium in its own action
directory. It does not add dependencies or lockfiles to the caller's repository, and copied code is
never executed.
