import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/core/**/*.test.ts",
      "test/persist/**/*.test.ts",
      "test/freeze/**/*.test.ts",
      "test/react/**/*.test.tsx",
    ],
  },
});
