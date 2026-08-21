import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: false,
    },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
