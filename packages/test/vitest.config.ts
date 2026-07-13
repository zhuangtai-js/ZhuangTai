import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const solidClientRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/dist/solid.js", import.meta.url),
);
const solidServerRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/dist/server.js", import.meta.url),
);
const solidClientWebRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/web/dist/web.js", import.meta.url),
);
const solidServerWebRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/web/dist/server.js", import.meta.url),
);
const vueRuntime = fileURLToPath(
  new URL("./node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url),
);
const vueServerRenderer = fileURLToPath(
  new URL(
    "./node_modules/@vue/server-renderer/dist/server-renderer.esm-bundler.js",
    import.meta.url,
  ),
);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          include: [
            "test/core/**/*.test.ts",
            "test/persist/**/*.test.ts",
            "test/freeze/**/*.test.ts",
            "test/immer/**/*.test.ts",
            "test/sync/**/*.test.ts",
            "test/plugins/**/*.test.ts",
            "test/types/**/*.test.ts",
            "test/react/**/*.test.tsx",
          ],
        },
      },
      {
        test: {
          name: "preact",
          include: ["test/preact/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "svelte",
          include: ["test/svelte/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: {
            "@vue/server-renderer": vueServerRenderer,
            vue: vueRuntime,
          },
        },
        test: {
          name: "vue",
          include: ["test/vue/**/*.test.js", "test/vue/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: [
            { find: /^solid-js$/, replacement: solidClientRuntime },
            { find: /^solid-js\/web$/, replacement: solidClientWebRuntime },
          ],
        },
        test: {
          name: "solid-client",
          include: ["test/solid/client.test.ts"],
        },
      },
      {
        resolve: {
          alias: [
            { find: /^solid-js$/, replacement: solidServerRuntime },
            { find: /^solid-js\/web$/, replacement: solidServerWebRuntime },
          ],
        },
        test: {
          name: "solid-server",
          include: ["test/solid/server.test.ts"],
        },
      },
    ],
  },
});
