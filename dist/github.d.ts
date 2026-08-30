import type { AuditReport } from "./types.js";
export interface GitHubResultOptions {
    summaryPath: string | undefined;
    writeCommand: (value: string) => void;
}
export declare function renderGitHubAnnotations(report: AuditReport): string[];
export declare function publishGitHubResult(report: AuditReport, options: GitHubResultOptions): Promise<void>;
//# sourceMappingURL=github.d.ts.map