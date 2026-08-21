# Architecture

## User story

A documentation maintainer supplies a rendered page and a canonical snippet; Snippet Fidelity opens
the page in an isolated Chromium context, clicks the intended copy control, observes the copy
handler and browser clipboard, compares each required observation exactly, and emits bounded
machine-readable evidence.

## Flow

```text
JSON config / URL
       |
       v
runtime validation -----> reject ambiguous or non-HTTP(S) input
       |
       v
isolated Chromium context
       |
       +---- init script wraps navigator.clipboard.writeText
       |
       v
page load -> explicit selector resolution OR nearby-button discovery
       |
       v
sentinel clipboard write -> one button click -> bounded polling
       |
       +---- handler payload observation
       +---- browser clipboard observation
       |
       v
exact comparison -> fingerprints/findings -> JSON/JUnit/Markdown
```

## Invariants

1. A configured selector matches exactly one copy control.
2. Clipboard-mutating checks run serially.
3. No observed text is normalized before the equality decision.
4. Classification is explanatory; it never converts a mismatch into a pass.
5. Full snippet text is absent from default reports.
6. `rendered-dom` is never described as canonical-source evidence.
7. Copied text is data and is never executed.

## Probe semantics

The handler recorder is installed before application scripts. It wraps
`navigator.clipboard.writeText`, records the string argument, and delegates to the browser's
original method. The sentinel write is removed from the recorder before clicking the target.

The browser-clipboard probe writes a unique sentinel, clicks the target, and polls until the
clipboard differs from the sentinel or the timeout expires. This prevents an unchanged clipboard
from being misreported as a successful empty or stale copy.

## Failure model

- `failed`: every required probe was available, but at least one did not match.
- `error`: a required probe was unavailable, navigation failed, discovery found nothing, or a
  selector was ambiguous.
- `passed`: every probe required by the configured mode existed and matched exactly.

Optional probe failures remain visible without changing the result. For example, an `execCommand`
copy implementation can pass `clipboard` mode while the handler-payload probe is unavailable.

## Versioning

Configuration and report schemas start at version 1. An incompatible machine-output change must
increment the report schema. Configuration migrations must retain a clear validation error for old
input rather than silently guessing.
