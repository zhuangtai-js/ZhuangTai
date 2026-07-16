import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  formatContractFailures,
  generatedNames,
  inspectLlmOutput,
  type GeneratedName,
} from "./llms-contract";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(docsRoot, "dist");

function readGenerated(name: GeneratedName): string {
  return readFileSync(join(distRoot, name), "utf8");
}

beforeAll(() => {
  execFileSync("pnpm", ["exec", "astro", "build"], {
    cwd: docsRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "pipe",
  });
}, 120_000);

describe("generated LLM documentation", () => {
  it.each(generatedNames)("keeps the Todo 9 contract in %s", (name) => {
    const output = readGenerated(name);
    const failures = inspectLlmOutput(name, output);

    expect(output.length).toBeGreaterThan(0);
    if (failures.length > 0) {
      throw new Error(formatContractFailures(failures));
    }
    expect(failures).toEqual([]);
  });

  it("keeps llms-small.txt smaller than the complete surface", () => {
    expect(readGenerated("llms-small.txt").length).toBeLessThan(
      readGenerated("llms-full.txt").length,
    );
  });

  it("keeps detailed adapter and migration references in llms-full.txt", () => {
    const output = readGenerated("llms-full.txt");

    const required = [
      /框架适配器最佳实践/,
      /Preact 参考/,
      /Svelte 参考/,
      /Vue 参考/,
      /Solid 参考/,
      /definePersistMigration/,
      /persist\.ready/,
      /persist\.flush/,
      /persist\.rehydrate/,
      /persist\.clear/,
      /createSSRApp/,
      /renderToString/,
    ];
    expect(required.filter((pattern) => !pattern.test(output))).toEqual([]);
  });
});
