#!/usr/bin/env node
interface CliIo {
    stdout: (value: string) => void;
    stderr: (value: string) => void;
}
export declare function runCli(args: string[], io?: CliIo): Promise<number>;
export {};
//# sourceMappingURL=cli.d.ts.map