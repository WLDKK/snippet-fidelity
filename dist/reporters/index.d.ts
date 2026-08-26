import type { AuditReport } from "../types.js";
import { renderJson } from "./json.js";
import { renderJunit } from "./junit.js";
import { renderMarkdown } from "./markdown.js";
export type ReporterName = "json" | "junit" | "markdown";
export declare function isReporterName(value: string): value is ReporterName;
export declare function writeReports(report: AuditReport, outputDirectory: string, reporters: ReporterName[]): Promise<string[]>;
export { renderJson, renderJunit, renderMarkdown };
//# sourceMappingURL=index.d.ts.map