# Public-site pilot study — 2026-08-26

This study tested Snippet Fidelity's automatic discovery mode against three maintained documentation
sites. It was a reconnaissance exercise, not a claim that every reported difference is a defect.
Discovery uses the rendered code block as its reference and therefore cannot establish whether a
site intentionally transforms presentation-only text such as shell prompts or final line breaks.

## Method

- Tool: Snippet Fidelity `0.2.0` release candidate
- Runtime: Node.js 24.14.0 on Windows, Playwright Chromium 151.0.7922.34
- Mode: live public URL, automatic discovery, browser clipboard probe
- Date: 2026-08-26 (UTC timestamps are recorded in each JSON report)
- Safety: copied text was observed but never executed

The local JSON reports are ignored by Git because live pages can drift and the reports describe a
point-in-time observation. Their SHA-256 digests are included below so a retained local report can
be matched to this note.

## Results

| Site                                                                                | Visible checks | Result                     | Interpretation                                                                                                                                                                                         | Report SHA-256                                                     |
| ----------------------------------------------------------------------------------- | -------------: | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [Astro Starlight](https://starlight.astro.build/getting-started/)                   |              3 | 3 passed                   | The active npm, development-server, and upgrade snippets matched at both the handler and browser-clipboard layers.                                                                                     | `91925680095419BB97448CC565E55ED9416431EF5C24A3C4284F4EBDA4DBA760` |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/getting-started/) |              4 | 4 rendered-DOM differences | Each copied command omitted one terminal newline present in the DOM. This is consistent and may be deliberate paste-friendly behavior; it is not treated as a bug without a canonical source contract. | `DFF93189367BD1C3F32BEFA625ED2D613F978577DDEAB720CA01453054EDF2D1` |
| [Doc Detective](https://docs.doc-detective.com/docs/get-started/introduction)       |              1 | 1 rendered-DOM difference  | The copy result omitted the displayed shell prompt marker. That is plausibly intentional and is not treated as a defect without the maintainer's canonical expectation.                                | `220B7F952B70339BCBA4CA4CC539FA81158A305D5CEBEF76536242F1DD9613A2` |

## What the pilot changed in Snippet Fidelity

The first run exposed false errors in Snippet Fidelity itself: documentation tab systems commonly
keep inactive code blocks mounted, so discovery attempted to click hidden duplicate controls. The
release candidate was corrected to:

1. exclude code blocks and controls that are not rendered;
2. retain hover-revealed controls instead of excluding them solely because their opacity begins at
   zero;
3. activate the selected control directly so pointer overlap is not confused with clipboard
   fidelity; and
4. cover hidden controls with an end-to-end regression fixture.

After the correction, the three sites produced no click timeouts. The repository's browser suite
contains 20 passing tests, including the new hidden-control regression.

## Adoption conclusion

The clean Starlight result demonstrates compatibility with a real documentation framework. The two
other results demonstrate why automatic discovery is suitable for reconnaissance but not for filing
bugs: maintainers must define the canonical snippet when the UI intentionally removes prompts or
terminal newlines. A responsible upstream proposal should therefore start with a source-aware
configuration owned by that project, not a screenshot of a discovery mismatch.
