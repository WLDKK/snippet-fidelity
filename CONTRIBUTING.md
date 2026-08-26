# Contributing

Thank you for improving Snippet Fidelity.

## Before implementation

For changes that alter the evidence model, browser behavior, configuration schema, or report schema,
start with an issue describing:

1. the user-visible failure being addressed;
2. a minimal public reproduction or synthetic fixture;
3. the expected evidence level (`canonical-*` or `rendered-dom`);
4. how false positives will be prevented.

Small documentation corrections and focused tests do not need prior design discussion.

## Local setup

```shell
pnpm install
pnpm exec playwright install chromium
pnpm verify
```

The compiled `dist/` tree is committed because tagged revisions are also consumed as a GitHub
Action. Run `pnpm build` and include matching `dist/` changes when source code changes.

## Change requirements

- Add a failing fixture or test before fixing a fidelity-classification bug.
- Never silently normalize observed clipboard content.
- Keep browser clipboard checks sequential.
- Do not add copied source text to reports by default.
- Do not execute content obtained from a documentation page.
- Update `schema/config.schema.json`, runtime validation, examples, and tests together when changing
  configuration.
- Update the report schema version when making an incompatible machine-output change.

## Pull requests

Keep pull requests narrowly scoped. Include the exact commands run and distinguish handler-payload
checks from browser-clipboard checks. A passing build without an end-to-end fixture is not enough
for changes to browser behavior.
