# Security policy

## Supported versions

The project is pre-release. Security fixes are provided for the latest published `0.x` release and
the `main` branch.

| Version             | Supported |
| ------------------- | --------- |
| Latest released 0.x | Yes       |
| Older 0.x releases  | No        |

## Reporting a vulnerability

Use GitHub's private vulnerability-reporting interface. Do not include private documentation URLs,
authentication cookies, copied secrets, or proprietary snippets in a public issue.

## Operational safety

Snippet Fidelity launches a browser and visits URLs supplied by the operator. Treat audited pages as
potentially hostile:

- use an isolated test account for authenticated documentation;
- do not reuse a personal browser profile;
- keep Chromium and Playwright updated;
- prefer preview deployments or local builds over production pages;
- review explicit button selectors before running against an unfamiliar site;
- do not put secrets in expected inline text.

The tool never executes copied text. Reports omit complete clipboard contents by default, but page
URLs, hashes, lengths, and bounded difference contexts may still be sensitive.
