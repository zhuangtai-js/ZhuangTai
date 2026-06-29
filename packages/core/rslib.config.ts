import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      index: "./src/index.ts",
    },
  },
  lib: [
    {
      format: "esm",
      bundle: true,
      dts: {
        bundle: true,
      },
    },
  ],
  output: {
    cleanDistPath: true,
    minify: true,
    sourceMap: true,
  },
});
