import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright";

const url = process.env.SNIPPET_FIDELITY_FIXTURE_URL ?? "http://127.0.0.1:4173/";
const screenshotPath = resolve(
  process.env.SNIPPET_FIDELITY_SCREENSHOT ?? "artifacts/browser/fixture.png",
);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(url, { waitUntil: "networkidle" });
  const bodyText = (await page.locator("body").innerText()).trim();
  const overlayCount = await page
    .locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")
    .count();
  const copyButtonCount = await page.getByRole("button", { name: /copy/i }).count();

  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    url,
    httpStatus: response?.status() ?? null,
    hasContent: bodyText.length > 0,
    overlayCount,
    copyButtonCount,
    consoleErrors,
    pageErrors,
    screenshotPath,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (
    !response?.ok() ||
    bodyText.length === 0 ||
    overlayCount > 0 ||
    copyButtonCount !== 6 ||
    consoleErrors.length > 0 ||
    pageErrors.length > 0
  ) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
