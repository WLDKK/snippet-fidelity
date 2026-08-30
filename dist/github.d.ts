import type { AuditReport } from "./types.js";
export interface GitHubResultOptions {
    summaryPath: string | undefined;
    outputPath: string | undefined;
    writeCommand: ((value: string) => void) | undefined;
}
export declare function renderGitHubAnnotations(report: AuditReport): string[];
export declare function publishGitHubResult(report: AuditReport, options: GitHubResultOptions): Promise<string[]>;
//# sourceMappingURL=github.d.ts.map