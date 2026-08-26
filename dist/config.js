import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const PROBE_MODES = new Set(["clipboard", "handler", "both"]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function configError(path, message) {
    throw new Error(`Invalid configuration at ${path}: ${message}`);
}
function requireNonEmptyString(value, path) {
    if (typeof value !== "string" || value.length === 0) {
        configError(path, "expected a non-empty string");
    }
    return value;
}
function validateTimeout(value, path) {
    if (value === undefined)
        return undefined;
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > 120_000) {
        configError(path, "expected an integer from 1 to 120000");
    }
    return value;
}
function validateProbe(value, path) {
    if (value === undefined)
        return undefined;
    if (typeof value !== "string" || !PROBE_MODES.has(value)) {
        configError(path, 'expected "clipboard", "handler", or "both"');
    }
    return value;
}
function validateExpected(value, path) {
    if (!isRecord(value))
        configError(path, "expected an object");
    const present = ["text", "file", "selector"].filter((key) => key in value);
    if (present.length !== 1) {
        configError(path, 'expected exactly one of "text", "file", or "selector"');
    }
    const key = present[0];
    if (key === "text") {
        if (typeof value.text !== "string")
            configError(`${path}.text`, "expected a string");
        return { text: value.text };
    }
    if (key === "file")
        return { file: requireNonEmptyString(value.file, `${path}.file`) };
    return { selector: requireNonEmptyString(value.selector, `${path}.selector`) };
}
function validateCheck(value, path) {
    if (!isRecord(value))
        configError(path, "expected an object");
    const check = {
        id: requireNonEmptyString(value.id, `${path}.id`),
        button: requireNonEmptyString(value.button, `${path}.button`),
        expected: validateExpected(value.expected, `${path}.expected`),
    };
    const probe = validateProbe(value.probe, `${path}.probe`);
    const timeoutMs = validateTimeout(value.timeoutMs, `${path}.timeoutMs`);
    if (probe !== undefined)
        check.probe = probe;
    if (timeoutMs !== undefined)
        check.timeoutMs = timeoutMs;
    return check;
}
function validateDiscovery(value, path) {
    if (!isRecord(value))
        configError(path, "expected an object");
    const discovery = {};
    const stringKeys = [
        "blockSelector",
        "codeSelector",
        "buttonSelector",
        "buttonNamePattern",
    ];
    for (const key of stringKeys) {
        if (value[key] !== undefined) {
            discovery[key] = requireNonEmptyString(value[key], `${path}.${key}`);
        }
    }
    if (discovery.buttonNamePattern !== undefined) {
        try {
            new RegExp(discovery.buttonNamePattern, "iu");
        }
        catch (error) {
            configError(`${path}.buttonNamePattern`, `invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (value.ancestorDepth !== undefined) {
        if (typeof value.ancestorDepth !== "number" ||
            !Number.isInteger(value.ancestorDepth) ||
            value.ancestorDepth < 0 ||
            value.ancestorDepth > 6) {
            configError(`${path}.ancestorDepth`, "expected an integer from 0 to 6");
        }
        discovery.ancestorDepth = value.ancestorDepth;
    }
    const probe = validateProbe(value.probe, `${path}.probe`);
    const timeoutMs = validateTimeout(value.timeoutMs, `${path}.timeoutMs`);
    if (probe !== undefined)
        discovery.probe = probe;
    if (timeoutMs !== undefined)
        discovery.timeoutMs = timeoutMs;
    return discovery;
}
function validatePage(value, path) {
    if (!isRecord(value))
        configError(path, "expected an object");
    const hasChecks = value.checks !== undefined;
    const hasDiscovery = value.discover !== undefined;
    if (hasChecks === hasDiscovery) {
        configError(path, 'expected exactly one of "checks" or "discover"');
    }
    const page = { url: requireNonEmptyString(value.url, `${path}.url`) };
    if (hasChecks) {
        if (!Array.isArray(value.checks) || value.checks.length === 0) {
            configError(`${path}.checks`, "expected a non-empty array");
        }
        page.checks = value.checks.map((check, index) => validateCheck(check, `${path}.checks[${index}]`));
        const ids = new Set();
        for (const check of page.checks) {
            if (ids.has(check.id))
                configError(`${path}.checks`, `duplicate check id "${check.id}"`);
            ids.add(check.id);
        }
    }
    else {
        page.discover = validateDiscovery(value.discover, `${path}.discover`);
    }
    return page;
}
export function validateConfig(value) {
    if (!isRecord(value))
        configError("$", "expected an object");
    if (value.version !== 1)
        configError("$.version", "only version 1 is supported");
    if (!Array.isArray(value.pages) || value.pages.length === 0) {
        configError("$.pages", "expected a non-empty array");
    }
    const config = {
        version: 1,
        pages: value.pages.map((page, index) => validatePage(page, `$.pages[${index}]`)),
    };
    if (value.baseUrl !== undefined) {
        config.baseUrl = requireNonEmptyString(value.baseUrl, "$.baseUrl");
        validateHttpUrl(config.baseUrl, "$.baseUrl");
    }
    if (value.browser !== undefined) {
        if (!isRecord(value.browser))
            configError("$.browser", "expected an object");
        const browser = {};
        if (value.browser.headless !== undefined) {
            if (typeof value.browser.headless !== "boolean") {
                configError("$.browser.headless", "expected a boolean");
            }
            browser.headless = value.browser.headless;
        }
        const timeoutMs = validateTimeout(value.browser.timeoutMs, "$.browser.timeoutMs");
        if (timeoutMs !== undefined)
            browser.timeoutMs = timeoutMs;
        config.browser = browser;
    }
    for (const [index, page] of config.pages.entries()) {
        resolvePageUrl(config, page, `$.pages[${index}].url`);
    }
    return config;
}
function validateHttpUrl(value, path) {
    let url;
    try {
        url = new URL(value);
    }
    catch {
        configError(path, `invalid URL "${value}"`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        configError(path, "only http and https URLs are allowed");
    }
    return url;
}
export function resolvePageUrl(config, page, path = "page.url") {
    let url;
    try {
        url = config.baseUrl === undefined ? new URL(page.url) : new URL(page.url, config.baseUrl);
    }
    catch {
        configError(path, "relative page URLs require a valid baseUrl");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        configError(path, "only http and https URLs are allowed");
    }
    return url.href;
}
export async function loadConfig(path) {
    const absolutePath = resolve(path);
    const source = (await readFile(absolutePath, "utf8")).replace(/^\uFEFF/, "");
    let parsed;
    try {
        parsed = JSON.parse(source);
    }
    catch (error) {
        throw new Error(`Could not parse configuration ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { config: validateConfig(parsed), directory: dirname(absolutePath) };
}
export async function resolveExpectedFile(path, configDirectory) {
    return readFile(resolve(configDirectory, path), "utf8");
}
//# sourceMappingURL=config.js.map