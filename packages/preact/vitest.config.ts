import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "../test",
  test: {
    include: ["test/preact/**/*.test.ts"],
  },
});
