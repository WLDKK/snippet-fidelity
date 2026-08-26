import type { AuditConfig, PageConfig } from "./types.js";
export declare function validateConfig(value: unknown): AuditConfig;
export declare function resolvePageUrl(config: AuditConfig, page: PageConfig, path?: string): string;
export declare function loadConfig(path: string): Promise<{
    config: AuditConfig;
    directory: string;
}>;
export declare function resolveExpectedFile(path: string, configDirectory: string): Promise<string>;
//# sourceMappingURL=config.d.ts.map