import assert from "node:assert/strict";
import { extname } from "node:path";
import { it } from "node:test";
import { assertContainsAll } from "./readme-consistency-compatibility.mjs";
import {
  collectFiles,
  positioningDocumentationPaths,
  publicDocumentationPaths,
  readText,
} from "./readme-consistency-context.mjs";

export function registerPublicDocumentationTests() {
  it("documents Persist sync/async lifecycle, migration, and failure semantics", () => {
    const persistReferencePaths = [
      "packages/docs/src/content/docs/reference/persist.md",
      "packages/docs/src/content/docs/en/reference/persist.md",
    ];

    for (const relativePath of persistReferencePaths) {
      assertContainsAll(
        readText(relativePath),
        [
          "version",
          "migrations",
          "definePersistMigration",
          "version 0",
          "cause",
          "Object.is",
          "PersistMigration",
          "PersistStorage",
          "PersistControls",
          "ready",
          "flush",
          "rehydrate",
          "clear",
          "PromiseLike",
          "SSR",
        ],
        relativePath,
      );
    }

    assertContainsAll(
      readText("packages/docs/src/content/docs/reference/persist.md"),
      [
        "正安全整数",
        "逐步",
        "同步抛错",
        "写回",
        "内存状态保持不变",
        "异步",
        "hydration",
        "const state = createAtom().use(persist)(0",
        "`set()` 同步 fail-closed",
        "`rehydrate()` 和 `clear()` 始终是 lifecycle Promise",
        "queued deferred write error",
      ],
      "packages/docs/src/content/docs/reference/persist.md",
    );
    assertContainsAll(
      readText("packages/docs/src/content/docs/en/reference/persist.md"),
      [
        "positive safe integer",
        "step by step",
        "throws synchronously",
        "write-back",
        "in-memory state stays unchanged",
        "asynchronous",
        "hydration",
        "const state = createAtom().use(persist)(0",
        "fails closed synchronously",
        "`rehydrate()` and `clear()` are always lifecycle Promises",
        "queued deferred write error",
      ],
      "packages/docs/src/content/docs/en/reference/persist.md",
    );

    assertContainsAll(
      readText("skills/zhuangtai-plugins/SKILL.md"),
      ["definePersistMigration", "version 0", "write-back", "future version", "cause"],
      "skills/zhuangtai-plugins/SKILL.md",
    );
    assert.ok(
      readText("skills/zhuangtai/SKILL.md").includes("zhuangtai-framework-adapters"),
      "skills/zhuangtai/SKILL.md must reference the framework adapter skill",
    );
  });

  it("keeps PromiseLike fallback guidance mirrored across public sources", () => {
    const chineseGuidance =
      "如果用内存回退包装 storage，必须按每次调用保留同步值或 `PromiseLike` 返回形状；异步 `getItem` 在完成后再校验和缓存，异步 `setItem` / `removeItem` 要观察 rejection 后再切换回退，不能直接丢弃 Promise。";
    const englishGuidance =
      "When wrapping storage with an in-memory fallback, preserve each call's synchronous or `PromiseLike` return shape; validate and cache async `getItem` after it settles, and observe async `setItem` / `removeItem` rejections before switching to the fallback instead of discarding the Promise.";

    for (const relativePath of [
      "README.md",
      "docs/guide/installation.md",
      "packages/persist/README.md",
      "packages/docs/src/content/docs/ai.md",
      "packages/docs/src/content/docs/reference/persist.md",
      "skills/zhuangtai/SKILL.md",
      "skills/zhuangtai-react/SKILL.md",
      "skills/zhuangtai-plugins/SKILL.md",
      "skills/zhuangtai-framework-adapters/SKILL.md",
    ]) {
      assertContainsAll(readText(relativePath), [chineseGuidance], relativePath);
    }

    for (const relativePath of [
      "docs/guide/README.en.md",
      "docs/guide/installation.md",
      "packages/persist/README.md",
      "packages/docs/src/content/docs/en/ai.md",
      "packages/docs/src/content/docs/en/reference/persist.md",
      "skills/zhuangtai/SKILL.md",
      "skills/zhuangtai-react/SKILL.md",
      "skills/zhuangtai-plugins/SKILL.md",
      "skills/zhuangtai-framework-adapters/SKILL.md",
    ]) {
      assertContainsAll(readText(relativePath), [englishGuidance], relativePath);
    }
  });

  it("keeps the public playground interactive, bilingual, and Tailwind-only", () => {
    const playgroundPaths = [
      "packages/docs/src/content/docs/playground.mdx",
      "packages/docs/src/content/docs/en/playground.mdx",
    ];

    for (const relativePath of playgroundPaths) {
      const source = readText(relativePath);
      assert.ok(
        source.includes("tableOfContents: true"),
        `${relativePath} must enable the page TOC`,
      );
      assert.ok(
        source.includes("<InteractiveExamples"),
        `${relativePath} must render the interactive React examples`,
      );
    }

    const docsSourcePaths = collectFiles("packages/docs/src");
    const stylesheetPaths = docsSourcePaths.filter((relativePath) =>
      [".css", ".less", ".sass", ".scss"].includes(extname(relativePath)),
    );
    assert.deepEqual(stylesheetPaths, ["packages/docs/src/styles/tailwind.css"]);

    const customUiPaths = docsSourcePaths.filter((relativePath) =>
      [".astro", ".md", ".mdx", ".ts", ".tsx"].includes(extname(relativePath)),
    );
    for (const relativePath of customUiPaths) {
      const source = readText(relativePath);
      assert.equal(
        source.includes("<style"),
        false,
        `${relativePath} adds a handwritten style block`,
      );
      assert.equal(
        /\sstyle\s*=/u.test(source),
        false,
        `${relativePath} adds an inline style attribute`,
      );
    }

    const publicPlaygroundSources = [
      "DESIGN.md",
      ...publicDocumentationPaths,
      ...customUiPaths.filter((relativePath) => relativePath.includes("/components/")),
      "packages/docs/astro.config.mjs",
    ];
    const forbiddenPublicPhrases = [
      "State Lab",
      "直接运行工作区",
      "real workspace packages",
      "调用时间线",
      "同步时间线",
      "进入 CI",
      "built in CI",
      "fixture",
      "探索性验证",
      "exploratory Bun and Deno verification",
    ];
    for (const relativePath of publicPlaygroundSources) {
      const source = readText(relativePath);
      for (const phrase of forbiddenPublicPhrases) {
        assert.equal(
          source.includes(phrase),
          false,
          `${relativePath} exposes internal copy: ${phrase}`,
        );
      }
    }
  });

  it("keeps public positioning focused on shipped capabilities", () => {
    const forbiddenPhrases = [
      "Zustand",
      "zustand",
      "Jotai",
      "jotai",
      "尚无官方指南",
      "暂时没有官方",
      "仍在规划",
      "No official guide",
      "no official adapter",
      "still planned",
    ];

    for (const relativePath of positioningDocumentationPaths) {
      const source = readText(relativePath);
      for (const phrase of forbiddenPhrases) {
        assert.equal(
          source.includes(phrase),
          false,
          `${relativePath} exposes internal or competitor-focused positioning: ${phrase}`,
        );
      }
    }
  });
}
