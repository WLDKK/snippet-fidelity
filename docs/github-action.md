# GitHub Action

The repository includes a composite action for running source-aware clipboard checks as a merge
gate. A checked-in configuration is preferred because it can compare rendered and copied text with
canonical repository files.

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

| Input        | Required | Default                   | Meaning                               |
| ------------ | -------- | ------------------------- | ------------------------------------- |
| `config`     | one of   |                           | Source-aware JSON configuration path  |
| `url`        | one of   |                           | URL for rendered-DOM discovery        |
| `output-dir` | no       | `snippet-fidelity-report` | Report destination                    |
| `reporters`  | no       | `markdown,json,junit`     | Comma-separated report formats        |
| `timeout`    | no       | tool default              | Per-operation timeout in milliseconds |

Exactly one of `config` and `url` is required. The action fails when a required probe reports a
mismatch or error, while still leaving reports in `output-dir` for an `if: always()` upload step.

The moving `v0` tag receives backward-compatible pre-1.0 updates. Pin the action to a full commit
SHA when your supply-chain policy requires immutable dependencies.

The action installs the repository's locked production dependencies and Chromium in its own action
directory. It does not add dependencies or lockfiles to the caller's repository, and copied code is
never executed.
