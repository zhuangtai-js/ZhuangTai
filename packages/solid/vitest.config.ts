import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const clientRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/dist/solid.js", import.meta.url),
);
const serverRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/dist/server.js", import.meta.url),
);
const clientWebRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/web/dist/web.js", import.meta.url),
);
const serverWebRuntime = fileURLToPath(
  new URL("./node_modules/solid-js/web/dist/server.js", import.meta.url),
);

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: [
            { find: /^solid-js$/, replacement: clientRuntime },
            { find: /^solid-js\/web$/, replacement: clientWebRuntime },
          ],
        },
        test: {
          name: "client",
          include: ["../test/test/solid/client.test.ts"],
        },
      },
      {
        resolve: {
          alias: [
            { find: /^solid-js$/, replacement: serverRuntime },
            { find: /^solid-js\/web$/, replacement: serverWebRuntime },
          ],
        },
        test: {
          name: "server",
          include: ["../test/test/solid/server.test.ts"],
        },
      },
    ],
  },
});
