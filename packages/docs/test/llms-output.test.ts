import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const distRoot = join(docsRoot, "dist");
const generatedNames = ["llms-small.txt", "llms.txt", "llms-full.txt"] as const;

type SemanticCheck = {
  readonly label: string;
  readonly patterns: readonly RegExp[];
};

function readGenerated(name: (typeof generatedNames)[number]): string {
  return readFileSync(join(distRoot, name), "utf8");
}

function expectSemantic(output: string, checks: readonly SemanticCheck[]): void {
  for (const { label, patterns } of checks) {
    const missing = patterns.filter((pattern) => !pattern.test(output));
    expect(missing, `${label} is missing semantic evidence`).toHaveLength(0);
  }
}

const commonChecks: readonly SemanticCheck[] = [
  {
    label: "中文 SSR 请求隔离",
    patterns: [
      /每个\s*SSR\s*请求/,
      /独立[^。；\n]{0,40}(?:atom|store)|(?:atom|store)[^。；\n]{0,40}独立/,
      /跨请求[^。；\n]{0,40}(?:共享|复用)/,
    ],
  },
  {
    label: "English SSR request isolation",
    patterns: [
      /(?:every|per)\s+SSR\s+request/i,
      /independent[^.;\n]{0,50}(?:atom|store)|(?:atom|store)[^.;\n]{0,50}per\s+SSR\s+request/i,
      /(?:never|do not)\s+share[^.;\n]{0,50}(?:mutable\s+state|state\s+across\s+requests)/i,
    ],
  },
  {
    label: "中文 Persist migration 边界",
    patterns: [
      /migration(?:\s*的)?\s*输入来自\s*storage/i,
      /unknown/,
      /(?:解析|收窄)/,
      /(?:按版本同步|逐步执行|连续[^。；\n]{0,20}(?:migration|迁移))/i,
      /durable\s+write/i,
      /失败[^。；\n]{0,50}(?:不提交|内存状态)/,
    ],
  },
  {
    label: "English Persist migration boundary",
    patterns: [
      /migration\s+input\s+comes\s+from\s+storage/i,
      /always\s+`?unknown`?/i,
      /parse\s+and\s+narrow/i,
      /migrations?\s+(?:synchronously|one\s+version\s+at\s+a\s+time)/i,
      /durable\s+write/i,
      /(?:do\s+not|does\s+not)\s+commit[^.;\n]{0,50}in-memory/i,
    ],
  },
  {
    label: "中文 Core 与 adapter 选择",
    patterns: [
      /直接使用\s+(?:`@zhuangtai-js\/core`|Core)/,
      /(?:组件|框架组件)[^。；\n]{0,100}(?:adapter|适配器)/,
    ],
  },
  {
    label: "English Core versus adapter choice",
    patterns: [
      /(?:use|using)\s+(?:`@zhuangtai-js\/core`|Core)\s+directly/i,
      /use\s+(?:(?:a|an)\s+)?(?:framework\s+)?adapter/i,
    ],
  },
  {
    label: "four framework adapters",
    patterns: [
      /@zhuangtai-js\/preact/,
      /@zhuangtai-js\/svelte/,
      /@zhuangtai-js\/vue/,
      /@zhuangtai-js\/solid/,
    ],
  },
  {
    label: "four Agent Skills",
    patterns: [
      /zhuangtai(?:[\s`-]|$)/,
      /zhuangtai-react/,
      /zhuangtai-plugins/,
      /zhuangtai-framework-adapters/,
    ],
  },
];

beforeAll(() => {
  execFileSync("pnpm", ["exec", "astro", "build"], {
    cwd: docsRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "pipe",
  });
}, 120_000);

describe("generated LLM documentation", () => {
  it.each(generatedNames)("keeps required guidance in %s", (name) => {
    const output = readGenerated(name);
    expect(output.length).toBeGreaterThan(0);
    expectSemantic(output, commonChecks);
  });

  it("keeps llms-small.txt smaller than the complete surface", () => {
    expect(readGenerated("llms-small.txt").length).toBeLessThan(
      readGenerated("llms-full.txt").length,
    );
  });

  it("keeps detailed adapter and migration references in llms-full.txt", () => {
    const output = readGenerated("llms-full.txt");
    expect(output.length).toBeGreaterThan(0);

    expectSemantic(output, [
      {
        label: "framework reference headings",
        patterns: [/框架适配器最佳实践/, /Preact 参考/, /Svelte 参考/, /Vue 参考/, /Solid 参考/],
      },
      {
        label: "detailed Persist migration API",
        patterns: [/definePersistMigration/, /createSSRApp/, /renderToString/],
      },
    ]);
  });
});
