import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderJson } from "./json.js";
import { renderJunit } from "./junit.js";
import { renderMarkdown } from "./markdown.js";
const REPORTERS = {
    json: { filename: "snippet-fidelity.json", render: renderJson },
    junit: { filename: "snippet-fidelity.junit.xml", render: renderJunit },
    markdown: { filename: "snippet-fidelity.md", render: renderMarkdown },
};
export function isReporterName(value) {
    return value === "json" || value === "junit" || value === "markdown";
}
export async function writeReports(report, outputDirectory, reporters) {
    const absoluteDirectory = resolve(outputDirectory);
    await mkdir(absoluteDirectory, { recursive: true });
    const paths = [];
    for (const reporter of reporters) {
        const definition = REPORTERS[reporter];
        const path = resolve(absoluteDirectory, definition.filename);
        await writeFile(path, definition.render(report), "utf8");
        paths.push(path);
    }
    return paths;
}
export { renderJson, renderJunit, renderMarkdown };
//# sourceMappingURL=index.js.map