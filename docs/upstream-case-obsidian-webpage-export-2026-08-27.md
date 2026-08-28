# Upstream case: Obsidian Webpage Export copy buttons — 2026-08-27

Status: [pull request #751](https://github.com/KosmosisDire/obsidian-webpage-export/pull/751) is
open and awaiting maintainer review. This document records a proposal, not an adoption or merge.

## Problem selected

[Issue #723](https://github.com/KosmosisDire/obsidian-webpage-export/issues/723) reports that copy
buttons rendered in exported pages do nothing. The project serializes Obsidian's rendered DOM, which
preserves the button markup but not the runtime click listener that Obsidian attached to it. The
failure was reproduced against a published export before implementation: clicking an inserted
representative `button.copy-code-button` after `postLoadInit()` left a clipboard sentinel unchanged.

## Proposed upstream change

Commit
[`9764c3f`](https://github.com/KosmosisDire/obsidian-webpage-export/commit/9764c3f994948ac5b572f68290d5e1d7edc7b48c)
adds document-initialization logic that:

- attaches a handler to each serialized copy button;
- copies the sibling `<code>` element's `textContent` without trimming or normalization;
- prefers the Clipboard API and falls back to a temporary selection for `file://` exports and
  rejected or unavailable Clipboard API writes;
- restores the prior selection and focus after the fallback; and
- uses a `WeakSet` to prevent duplicate listeners when a document is initialized again.

The initializer runs through the existing `postLoadInit()` lifecycle, so the main document,
dynamically loaded child documents, and previews follow the same path.

## Validation evidence

- The upstream TypeScript and frontend production build completed successfully.
- ESLint passed for the new module. The repository-wide lint result is not claimed because the
  touched existing document module has pre-existing findings unrelated to this change.
- A browser regression verified exact handler payload for tabs, decomposed Unicode, and the final
  newline; duplicate initialization; and the legacy fallback after a rejected Clipboard API write.
- A real Windows clipboard round-trip preserved content apart from the operating system's expected
  LF-to-CRLF conversion.
- Snippet Fidelity's source-aware rendered-page audit passed its configured check (`1/1`).
- GitHub reports two commits, two changed files, 94 additions, no conflicts with the base branch,
  and no CI workflow or commit-status checks configured at submission time.

The retained local Snippet Fidelity report is
`artifacts/upstream-pilot/snippet-report-final/snippet-fidelity.md`. The artifacts directory is
intentionally ignored because it can include point-in-time browser output.

## Post-submission review

Copilot's first review identified a real edge case: `Document.execCommand` can be absent or throw,
which would let an implementation-specific exception escape instead of reporting a failed fallback.
Follow-up commit
[`9beb0b2`](https://github.com/KosmosisDire/obsidian-webpage-export/pull/751/commits/9beb0b297ef98e0dcde951004a63a6042515a61e)
uses an optional call, converts exceptions into a `false` result, and still restores the prior
focus/selection and removes the temporary textarea in `finally`.

The follow-up was verified with the production build, ESLint on the module, the original browser
regression suite, and new browser cases for both a missing and a throwing `execCommand`. The
source-aware Snippet Fidelity audit remained `1/1` passed. This review response is stronger evidence
than treating the initial submission as finished: it records how an external finding changed the
implementation and expanded the regression contract.

## What this case demonstrates

Snippet Fidelity did not discover the already-reported issue. It provided a precise acceptance
contract for the proposed fix: the text received by the copy handler and the text exposed by the
real browser clipboard can be measured separately. That distinction made the Windows line-ending
conversion observable without incorrectly attributing it to the application handler.

The contribution becomes upstream adoption evidence only if the maintainer reviews or merges it.
Until then, the verifiable outcome is a reproducible, validated proposal tied to a real user report.
