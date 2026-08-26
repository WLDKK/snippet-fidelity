import { randomUUID } from "node:crypto";
import { cwd } from "node:process";
import { chromium } from "playwright";
import { compareText, fingerprintText } from "./compare.js";
import { resolveExpectedFile, resolvePageUrl } from "./config.js";
import { REPORT_SCHEMA_VERSION, TOOL_NAME, TOOL_VERSION } from "./version.js";
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_BUTTON_PATTERN = "copy|复制|copier|copiar|kopieren|コピー|복사";
async function installProbeRecorder(context) {
    await context.addInitScript(() => {
        const probeWindow = window;
        const state = { writes: [], installError: null };
        Object.defineProperty(probeWindow, "__snippetFidelityState", {
            configurable: false,
            enumerable: false,
            value: state,
        });
        try {
            const clipboard = navigator.clipboard;
            if (clipboard === undefined || typeof clipboard.writeText !== "function") {
                state.installError = "navigator.clipboard.writeText is unavailable in this context";
                return;
            }
            const originalWriteText = clipboard.writeText.bind(clipboard);
            Object.defineProperty(clipboard, "writeText", {
                configurable: true,
                value: async (text) => {
                    state.writes.push(String(text));
                    return originalWriteText(text);
                },
            });
        }
        catch (error) {
            state.installError = error instanceof Error ? error.message : String(error);
        }
    });
}
function probeResult(kind, expectedText, actualText, error) {
    if (actualText === null) {
        return { kind, available: false, fingerprint: null, comparison: null, error };
    }
    return {
        kind,
        available: true,
        fingerprint: fingerprintText(actualText),
        comparison: compareText(expectedText, actualText),
        error: null,
    };
}
function requiredProbeKinds(mode) {
    if (mode === "handler")
        return ["handler-payload"];
    if (mode === "both")
        return ["handler-payload", "browser-clipboard"];
    return ["browser-clipboard"];
}
function statusFromProbes(mode, probes) {
    const required = requiredProbeKinds(mode).map((kind) => probes.find((probe) => probe.kind === kind));
    if (required.some((probe) => probe === undefined || !probe.available))
        return "error";
    if (required.some((probe) => probe?.comparison?.exact === false))
        return "failed";
    return "passed";
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
async function resolveExpected(expected, page, configDirectory) {
    if ("text" in expected)
        return { text: expected.text, source: "canonical-text" };
    if ("file" in expected) {
        return {
            text: await resolveExpectedFile(expected.file, configDirectory),
            source: "canonical-file",
        };
    }
    const locator = page.locator(expected.selector);
    const count = await locator.count();
    if (count !== 1) {
        throw new Error(`Expected selector ${JSON.stringify(expected.selector)} matched ${count} elements; expected exactly one.`);
    }
    return { text: (await locator.textContent()) ?? "", source: "rendered-dom" };
}
async function resolveExplicitChecks(checks, page, configDirectory, defaultTimeoutMs) {
    const resolved = [];
    for (const check of checks) {
        const expected = await resolveExpected(check.expected, page, configDirectory);
        resolved.push({
            id: check.id,
            button: check.button,
            expectedText: expected.text,
            expectedSource: expected.source,
            probe: check.probe ?? "clipboard",
            timeoutMs: check.timeoutMs ?? defaultTimeoutMs,
        });
    }
    return resolved;
}
async function discoverChecks(page, discovery, defaultTimeoutMs) {
    const options = {
        blockSelector: discovery.blockSelector ?? "pre",
        codeSelector: discovery.codeSelector ?? "code",
        buttonSelector: discovery.buttonSelector ?? 'button,[role="button"]',
        buttonNamePattern: discovery.buttonNamePattern ?? DEFAULT_BUTTON_PATTERN,
        ancestorDepth: discovery.ancestorDepth ?? 2,
    };
    const scan = () => page.evaluate((input) => {
        document
            .querySelectorAll("[data-snippet-fidelity-button]")
            .forEach((element) => element.removeAttribute("data-snippet-fidelity-button"));
        const namePattern = new RegExp(input.buttonNamePattern, "iu");
        const usedButtons = new Set();
        const results = [];
        const blocks = [...document.querySelectorAll(input.blockSelector)];
        for (const [index, block] of blocks.entries()) {
            const code = block.matches(input.codeSelector)
                ? block
                : (block.querySelector(input.codeSelector) ?? block);
            let scope = block;
            let button = null;
            for (let depth = 0; depth <= input.ancestorDepth && scope !== null; depth += 1) {
                const candidates = [
                    ...(scope.matches(input.buttonSelector) ? [scope] : []),
                    ...scope.querySelectorAll(input.buttonSelector),
                ];
                button =
                    candidates.find((candidate) => {
                        if (usedButtons.has(candidate))
                            return false;
                        const accessibleName = [
                            candidate.getAttribute("aria-label"),
                            candidate.getAttribute("title"),
                            candidate.textContent,
                        ]
                            .filter((value) => value !== null)
                            .join(" ");
                        return namePattern.test(accessibleName);
                    }) ?? null;
                if (button !== null)
                    break;
                scope = scope.parentElement;
            }
            if (button === null)
                continue;
            const marker = `sf-${index + 1}`;
            button.setAttribute("data-snippet-fidelity-button", marker);
            usedButtons.add(button);
            results.push({
                id: code.getAttribute("data-snippet-id") ??
                    block.getAttribute("data-snippet-id") ??
                    `discovered-${index + 1}`,
                button: `[data-snippet-fidelity-button="${marker}"]`,
                expectedText: code.textContent ?? "",
            });
        }
        return results;
    }, options);
    let discovered = await scan();
    const deadline = Date.now() + defaultTimeoutMs;
    while (discovered.length === 0) {
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0)
            break;
        await page.waitForTimeout(Math.min(50, remainingMs));
        discovered = await scan();
    }
    return discovered.map((check) => ({
        ...check,
        expectedSource: "rendered-dom",
        probe: discovery.probe ?? "clipboard",
        timeoutMs: discovery.timeoutMs ?? defaultTimeoutMs,
    }));
}
async function resetProbeState(page, sentinel) {
    return page.evaluate(async (sentinelValue) => {
        const probeWindow = window;
        const state = probeWindow.__snippetFidelityState;
        if (state !== undefined)
            state.writes = [];
        try {
            await navigator.clipboard.writeText(sentinelValue);
            if (state !== undefined)
                state.writes = [];
            return null;
        }
        catch (error) {
            if (state !== undefined)
                state.writes = [];
            return error instanceof Error ? error.message : String(error);
        }
    }, sentinel);
}
async function readProbeState(page) {
    return page.evaluate(() => {
        const probeWindow = window;
        const state = probeWindow.__snippetFidelityState;
        return {
            handlerText: state?.writes.at(-1) ?? null,
            handlerError: state?.installError ?? "handler recorder was not installed",
        };
    });
}
async function readClipboard(page) {
    return page.evaluate(async () => {
        try {
            return { text: await navigator.clipboard.readText(), error: null };
        }
        catch (error) {
            return { text: null, error: error instanceof Error ? error.message : String(error) };
        }
    });
}
function captureComplete(mode, capture) {
    const handlerComplete = capture.handlerText !== null;
    const clipboardComplete = capture.clipboardText !== null;
    if (mode === "handler")
        return handlerComplete;
    if (mode === "both")
        return handlerComplete && clipboardComplete;
    return clipboardComplete;
}
async function captureCopy(page, buttonSelector, mode, timeoutMs) {
    const button = page.locator(buttonSelector);
    const count = await button.count();
    if (count !== 1) {
        throw new Error(`Copy button selector ${JSON.stringify(buttonSelector)} matched ${count} elements; expected exactly one.`);
    }
    const sentinel = `snippet-fidelity:${randomUUID()}`;
    const clipboardResetError = await resetProbeState(page, sentinel);
    await button.click({ timeout: timeoutMs });
    const capture = {
        handlerText: null,
        handlerError: null,
        clipboardText: null,
        clipboardError: clipboardResetError,
    };
    const deadline = Date.now() + timeoutMs;
    do {
        const handler = await readProbeState(page);
        capture.handlerText = handler.handlerText;
        capture.handlerError = handler.handlerText === null ? handler.handlerError : null;
        if (clipboardResetError === null) {
            const clipboard = await readClipboard(page);
            capture.clipboardError = clipboard.error;
            if (clipboard.text !== null && clipboard.text !== sentinel) {
                capture.clipboardText = clipboard.text;
            }
        }
        if (captureComplete(mode, capture))
            break;
        await page.waitForTimeout(50);
    } while (Date.now() < deadline);
    if (capture.handlerText === null && capture.handlerError === null) {
        capture.handlerError = "No navigator.clipboard.writeText payload was observed before timeout.";
    }
    if (capture.clipboardText === null && capture.clipboardError === null) {
        capture.clipboardError = "Clipboard did not change before timeout.";
    }
    return capture;
}
async function runCheck(page, pageUrl, check) {
    const startedAt = performance.now();
    const expected = {
        source: check.expectedSource,
        fingerprint: fingerprintText(check.expectedText),
    };
    try {
        const capture = await captureCopy(page, check.button, check.probe, check.timeoutMs);
        const probes = [
            probeResult("handler-payload", check.expectedText, capture.handlerText, capture.handlerError),
            probeResult("browser-clipboard", check.expectedText, capture.clipboardText, capture.clipboardError),
        ];
        return {
            id: check.id,
            pageUrl,
            buttonSelector: check.button,
            status: statusFromProbes(check.probe, probes),
            expected,
            probes,
            error: null,
            durationMs: Math.round(performance.now() - startedAt),
        };
    }
    catch (error) {
        return {
            id: check.id,
            pageUrl,
            buttonSelector: check.button,
            status: "error",
            expected,
            probes: [],
            error: errorMessage(error),
            durationMs: Math.round(performance.now() - startedAt),
        };
    }
}
function pageErrorResult(pageUrl, id, error, startedAt) {
    return {
        id,
        pageUrl,
        buttonSelector: null,
        status: "error",
        expected: null,
        probes: [],
        error: errorMessage(error),
        durationMs: Math.round(performance.now() - startedAt),
    };
}
export async function audit(config, options = {}) {
    const configDirectory = options.configDirectory ?? cwd();
    const defaultTimeoutMs = config.browser?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const browser = await chromium.launch({ headless: config.browser?.headless ?? true });
    const browserVersion = browser.version();
    const context = await browser.newContext();
    await installProbeRecorder(context);
    const checks = [];
    try {
        for (const [pageIndex, pageConfig] of config.pages.entries()) {
            const pageUrl = resolvePageUrl(config, pageConfig);
            const startedAt = performance.now();
            const page = await context.newPage();
            try {
                try {
                    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
                        origin: new URL(pageUrl).origin,
                    });
                }
                catch {
                    // The probe reports the concrete clipboard error if this browser rejects the grant.
                }
                page.setDefaultTimeout(defaultTimeoutMs);
                await page.goto(pageUrl, { waitUntil: "load", timeout: defaultTimeoutMs });
                await page.bringToFront();
                const resolved = pageConfig.checks !== undefined
                    ? await resolveExplicitChecks(pageConfig.checks, page, configDirectory, defaultTimeoutMs)
                    : await discoverChecks(page, pageConfig.discover ?? {}, defaultTimeoutMs);
                if (resolved.length === 0) {
                    checks.push(pageErrorResult(pageUrl, `page-${pageIndex + 1}-discovery`, new Error("No copy controls were discovered near matching code blocks."), startedAt));
                    continue;
                }
                for (const check of resolved)
                    checks.push(await runCheck(page, pageUrl, check));
            }
            catch (error) {
                checks.push(pageErrorResult(pageUrl, `page-${pageIndex + 1}`, error, startedAt));
            }
            finally {
                await page.close();
            }
        }
    }
    finally {
        await context.close();
        await browser.close();
    }
    const summary = {
        total: checks.length,
        passed: checks.filter((check) => check.status === "passed").length,
        failed: checks.filter((check) => check.status === "failed").length,
        errors: checks.filter((check) => check.status === "error").length,
    };
    return {
        schemaVersion: REPORT_SCHEMA_VERSION,
        tool: { name: TOOL_NAME, version: TOOL_VERSION },
        generatedAt: new Date().toISOString(),
        environment: {
            browser: "chromium",
            browserVersion,
            node: process.version,
            platform: process.platform,
            architecture: process.arch,
        },
        summary,
        checks,
    };
}
//# sourceMappingURL=audit.js.map