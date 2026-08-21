# Threat model

## Assets

- authentication state used to reach private documentation;
- canonical source snippets;
- clipboard contents outside the audit;
- CI logs and generated reports;
- the machine running Chromium.

## Trust boundaries

The configuration and expected files are operator-controlled. The audited page, its scripts,
subresources, and redirects are untrusted. Chromium and Playwright are privileged dependencies
because they access a real browser clipboard interface.

## Risks and controls

### Unintended actions

Discovery might mistake another control for a copy button. It only considers copy-named buttons
within a bounded ancestor distance of a matching code block. Release gates should use explicit
selectors, which must match exactly one element.

### Clipboard contamination

The clipboard is shared mutable state. Checks run serially and seed a unique sentinel before every
click. Use an isolated CI runner when clipboard contents may be sensitive.

### Secret disclosure

Default reports contain hashes, counts, page URLs, and bounded escaped contexts, not full text.
Difference contexts can still reveal short secrets; do not audit secret-bearing blocks without
reviewing the reporting policy.

### Code execution

Copied content is never passed to a shell, interpreter, parser with execution hooks, or package
manager. Fixture transforms are static browser JavaScript owned by the test suite.

### Hostile pages

The browser uses a fresh context without a persistent profile. The current prototype does not yet
implement request allowlists or subresource isolation. Run unknown pages in a disposable
environment.

## Explicit non-claims

A handler-payload pass does not prove an OS clipboard round-trip. A browser-clipboard pass does not
prove that every native paste target preserves the text. Rendered-DOM discovery does not prove the
renderer preserved the repository source.
