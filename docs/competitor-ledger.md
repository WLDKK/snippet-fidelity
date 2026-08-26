# Competitor and adjacent-work ledger

Last reviewed: 2026-08-26

This ledger prevents the project from drifting into an already-served category. "No direct
competitor found" means no reusable project was found with the same primary user, input, and core
output. It is not a claim that private or unindexed software cannot exist.

## Direct-project search definition

- **Primary user:** maintainers of rendered developer documentation.
- **Input:** a rendered documentation page plus canonical or rendered code text.
- **Core operation:** activate the page's copy control in a browser.
- **Core output:** an exact source/DOM-to-handler/clipboard comparison suitable for CI.

No standalone open-source project matching all four points was found in GitHub repository/code
searches, npm, PyPI, crates.io, or scholarly searches under the terms recorded below.

The 2026-08-26 pre-release refresh repeated the focused GitHub and npm searches. It did not find a
reusable project matching all four points, but it did identify strong adjacent tools. This is a
narrow differentiation claim, not a claim that maintainers have no alternative: a project-local
Playwright assertion is the most direct substitute.

## Adjacent work

| Project                                                                                                           | What it covers                                              | Boundary from Snippet Fidelity                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [Doc Detective](https://github.com/doc-detective/doc-detective)                                                   | Browser, API, procedure, and code testing for documentation | Broad documentation testing; exact canonical/DOM/handler/clipboard comparison is not its primary contract |
| [Playwright Clipboard](https://github.com/vrknetha/playwright-clipboard)                                          | Cross-browser clipboard operations for Playwright tests     | A low-level fixture library; not source-aware documentation discovery, evidence, or reporting             |
| [AIX Validator](https://solotrillion.io/validator)                                                                | Conformance of pasted AI-generated Markdown                 | Does not crawl documentation pages, activate code-copy controls, or compare against canonical code        |
| [W3C Clipboard API tests](https://github.com/w3c/clipboard-apis/blob/main/tests.html)                             | Clipboard API behavior                                      | Browser API conformance rather than documentation-snippet fidelity                                        |
| [Leia](https://www.npmjs.com/package/@lando/leia)                                                                 | Execution of commands embedded in Markdown                  | Tests whether examples run, not what a copy control writes                                                |
| [remark-lint](https://github.com/remarkjs/remark-lint)                                                            | Markdown source style                                       | Does not exercise rendering or the clipboard                                                              |
| [textbee local E2E check](https://github.com/textbee/textbee/blob/main/web/e2e/api-guide.spec.ts)                 | One repository's copy control                               | Project-local assertion, not a reusable cross-framework corpus or tool                                    |
| [Nextcloud Text local E2E check](https://github.com/nextcloud/text/blob/main/cypress/e2e/nodes/CodeBlock.spec.js) | One product's code-block copy behavior                      | Project-local assertion, not source-aware documentation CI tooling                                        |

## Demand evidence

- [Material for MkDocs #6327](https://github.com/squidfunk/mkdocs-material/issues/6327): a copy
  control added a terminal newline, which could execute a pasted command immediately.
- [Material for MkDocs #7170](https://github.com/squidfunk/mkdocs-material/issues/7170): copied code
  acquired double blank lines.
- [Docusaurus #11414](https://github.com/facebook/docusaurus/issues/11414): copied code lost
  indentation.
- [Docusaurus #11791](https://github.com/facebook/docusaurus/issues/11791): a native Clipboard API
  change broke copying in non-secure network contexts.

## Search terms

- clipboard fidelity documentation
- code block clipboard conformance
- documentation copy button verifier
- code copy integrity CI
- Playwright documentation clipboard test
- Doc Detective clipboard copy validation
- playwright-clipboard documentation code block
- source to clipboard code block
- GitHub Action verify copy code buttons

## Re-evaluation rule

Repeat this search before a public `1.0` release and whenever the project expands beyond exact code
copy fidelity. Finding a direct project should trigger collaboration or a scope decision, not
marketing wordplay.
