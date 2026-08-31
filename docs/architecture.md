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
proof graph -> pairwise exact comparisons -> fingerprints/findings -> JSON/JUnit/Markdown
```

## Invariants

1. A configured selector matches exactly one copy control.
2. Clipboard-mutating checks run serially.
3. No observed text is normalized before the equality decision.
4. Classification is explanatory; it never converts a mismatch into a pass.
5. Full snippet text is absent from default reports.
6. `rendered-dom` is never described as canonical-source evidence.
7. Copied text is data and is never executed.

## Proof graph

Every resolved check produces four ordered evidence nodes:

```text
canonical-source -> rendered-dom -> handler-payload -> browser-clipboard
```

The order describes the delivery path, not an assumption that every stage was observed. Each node is
explicitly labeled:

- `available`: text was observed and fingerprinted;
- `unavailable`: the runtime attempted the observation but could not capture it;
- `not-observed`: the check did not configure or instrument that stage.

The graph contains all six possible stage pairs. An edge is `exact`, `mismatch`, or
`not-comparable`. Only comparisons from the configured baseline to required probe nodes determine
the check status. Other edges remain informational; in particular, handler-to-clipboard comparison
can reveal an operating-system transformation without silently redefining fidelity.

In the current runtime, a check has either `canonical-source` or `rendered-dom` as its baseline.
Observing both independently requires build-time provenance and is intentionally deferred to the
Contract Compiler phase. The graph represents that missing stage as `not-observed` rather than
inventing evidence.

## Probe semantics

The handler recorder is installed before application scripts. It wraps
`navigator.clipboard.writeText`, records the string argument, and delegates to the browser's
original method. The sentinel write is removed from the recorder before clicking the target.

The browser-clipboard probe writes a unique sentinel, clicks the target, and polls until the
clipboard differs from the sentinel or the timeout expires. This prevents an unchanged clipboard
from being misreported as a successful empty or stale copy.

Discovery performs bounded retries when no matching controls exist immediately after navigation.
This covers client-rendered documentation without turning continuously changing pages into an
unbounded wait.

## Failure model

- `failed`: every required graph edge was comparable, but at least one was a mismatch.
- `error`: a required graph edge was not comparable, navigation failed, discovery found nothing, or
  a selector was ambiguous.
- `passed`: every graph edge required by the configured mode was exact.

Optional probe failures remain visible without changing the result. For example, an `execCommand`
copy implementation can pass `clipboard` mode while the handler-payload probe is unavailable.

## Versioning

Configuration and report schemas start at version 1. Proof graphs have their own version field and
are additive to the existing per-check `expected` and `probes` fields. An incompatible
machine-output change must increment the report schema. Configuration migrations must retain a clear
validation error for old input rather than silently guessing.
