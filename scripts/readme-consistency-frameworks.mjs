import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import { assertContainsAll, installPackages } from "./readme-consistency-compatibility.mjs";
import { publishablePackages, readText, rootPath } from "./readme-consistency-context.mjs";
import { commands } from "./readme-consistency-markdown.mjs";

const adapters = [
  {
    directory: "preact",
    peer: "preact",
    api: ["useAtomValue", "useSetAtom", "useAtom", "createAtomHook", "createComputedHook"],
    chooserApi: ["useAtomValue", "useSetAtom", "useAtom"],
  },
  {
    directory: "svelte",
    peer: "svelte",
    api: ["toReadable", "toWritable"],
    chooserApi: ["toReadable", "toWritable"],
  },
  {
    directory: "vue",
    peer: "vue",
    api: ["useAtomValue", "useSetAtom", "useAtom"],
    chooserApi: ["useAtomValue", "useSetAtom", "useAtom"],
  },
  {
    directory: "solid",
    peer: "solid-js",
    api: ["createAtomValue", "createSetAtom", "createAtomSignal"],
    chooserApi: ["createAtomValue", "createSetAtom", "createAtomSignal"],
  },
];
const chooserPaths = [
  "packages/docs/src/content/docs/guides/framework-adapters.md",
  "packages/docs/src/content/docs/en/guides/framework-adapters.md",
];

function packageEntry(directory) {
  const entry = publishablePackages.find((candidate) => candidate.directory === directory);
  assert.notEqual(entry, undefined);
  return entry;
}

function localizedPaths(section, directory) {
  return [
    `packages/docs/src/content/docs/${section}/${directory}.md`,
    `packages/docs/src/content/docs/en/${section}/${directory}.md`,
  ];
}

export function registerFrameworkDocumentationTests() {
  it("keeps docs-site package reference install commands manifest-driven", () => {
    for (const { directory, manifest } of publishablePackages) {
      const expected = [`pnpm add ${installPackages(manifest).join(" ")}`];
      for (const relativePath of localizedPaths("reference", directory)) {
        assert.ok(
          existsSync(join(rootPath, relativePath)),
          `${manifest.name} is missing ${relativePath}`,
        );
        assert.deepEqual(
          commands(readText(relativePath), "pnpm add"),
          expected,
          `${relativePath} install command drifted`,
        );
      }
    }

    const react = packageEntry("react");
    const expectedReact = [`pnpm add ${installPackages(react.manifest).join(" ")}`];
    for (const relativePath of localizedPaths("guides", "react")) {
      assert.deepEqual(
        commands(readText(relativePath), "pnpm add"),
        expectedReact,
        `${relativePath} install command drifted`,
      );
    }
  });

  it("documents framework adapters with manifest-derived ranges and lifecycle boundaries", () => {
    for (const adapter of adapters) {
      const entry = packageEntry(adapter.directory);
      const range = entry.manifest.peerDependencies?.[adapter.peer];
      assert.equal(typeof range, "string");

      for (const relativePath of [
        ...localizedPaths("guides", adapter.directory),
        ...localizedPaths("reference", adapter.directory),
      ]) {
        const source = readText(relativePath);
        assert.ok(source.includes(entry.manifest.name), `${relativePath} omits package name`);
        assert.ok(source.includes(range), `${relativePath} omits ${adapter.peer} range ${range}`);
        assertContainsAll(source, adapter.api, relativePath);
      }

      for (const relativePath of chooserPaths) {
        const source = readText(relativePath);
        assert.ok(source.includes(entry.manifest.name), `${relativePath} omits package name`);
        assertContainsAll(source, adapter.chooserApi, relativePath);
      }
    }

    assertContainsAll(
      readText(chooserPaths[0]),
      ["Object.is", "Core", "SSR", "不可变"],
      chooserPaths[0],
    );
    const englishChooser = readText(chooserPaths[1]);
    assertContainsAll(englishChooser, ["Object.is", "Core", "SSR"], chooserPaths[1]);
    assert.match(englishChooser, /immutab(?:le|ly)/u);

    const chineseVueGuide = readText("packages/docs/src/content/docs/guides/vue.md");
    assert.ok(chineseVueGuide.includes("不会建立 Core 订阅"));
    assert.equal(/(?<!不)会建立 Core 订阅/u.test(chineseVueGuide), false);
    const chineseVueReference = readText("packages/docs/src/content/docs/reference/vue.md");
    assertContainsAll(
      chineseVueReference,
      [
        "每个请求",
        "createSSRApp",
        "renderToString",
        "只读取 `atom.get()` snapshot",
        "不安装 Core watcher",
        "只有客户端活动 effect scope 中的读取 API 才会订阅 Core",
        "scope cleanup 自动释放",
        "onScopeDispose",
      ],
      "packages/docs/src/content/docs/reference/vue.md",
    );
    assert.equal(chineseVueReference.includes("renderToString` 完成后会停止组件 scope"), false);

    const englishVueGuide = readText("packages/docs/src/content/docs/en/guides/vue.md");
    assert.ok(englishVueGuide.includes("does not install a Core subscription"));
    const englishVueReference = readText("packages/docs/src/content/docs/en/reference/vue.md");
    assertContainsAll(
      englishVueReference,
      [
        "per request",
        "createSSRApp",
        "renderToString",
        "only reads an `atom.get()` snapshot",
        "does not install a Core watcher",
        "Only read APIs in an active client effect scope subscribe to Core",
        "scope cleanup registered with `onScopeDispose` releases them",
      ],
      "packages/docs/src/content/docs/en/reference/vue.md",
    );
    assert.equal(
      englishVueReference.includes(
        "renderToString` provides the active component scope and stops that scope after rendering",
      ),
      false,
    );

    const sidebar = readText("packages/docs/src/config/sidebar.mjs");
    assertContainsAll(
      sidebar,
      [
        'slug: "guides/framework-adapters"',
        'slug: "reference/preact"',
        'slug: "reference/svelte"',
        'slug: "reference/vue"',
        'slug: "reference/solid"',
      ],
      "packages/docs/src/config/sidebar.mjs",
    );

    assertContainsAll(
      readText("skills/zhuangtai-framework-adapters/SKILL.md"),
      [
        "@zhuangtai-js/preact",
        "@zhuangtai-js/svelte",
        "@zhuangtai-js/vue",
        "@zhuangtai-js/solid",
        "per request",
        "Object.is",
      ],
      "skills/zhuangtai-framework-adapters/SKILL.md",
    );
  });
}
