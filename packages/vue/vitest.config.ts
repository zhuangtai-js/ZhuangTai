import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vue/server-renderer": fileURLToPath(
        new URL(
          "./node_modules/@vue/server-renderer/dist/server-renderer.esm-bundler.js",
          import.meta.url,
        ),
      ),
      vue: fileURLToPath(
        new URL("./node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["../test/test/vue/**/*.test.ts"],
  },
});
