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
        bundle: false,
      },
      output: {
        externals: ["@zhuangtai-js/core", "immer"],
      },
    },
  ],
  output: {
    cleanDistPath: true,
    minify: true,
    sourceMap: false,
  },
});
