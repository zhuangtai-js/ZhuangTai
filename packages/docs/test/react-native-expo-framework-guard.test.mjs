import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sidebar } from "../src/config/sidebar.mjs";
import { guides, readChooser, readGuide } from "./framework-guides-fixtures.mjs";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(docsRoot, "../..");
const chooserContracts = {
  Preact: ["`@zhuangtai-js/preact`", "`useAtomValue`", "`useSetAtom`", "`useAtom`"],
  Svelte: ["`@zhuangtai-js/svelte`", "`toReadable`", "`atom.set`", "`toWritable`"],
  Vue: ["`@zhuangtai-js/vue`", "`useAtomValue`", "`useSetAtom`", "`useAtom`"],
  Solid: ["`@zhuangtai-js/solid`", "`createAtomValue`", "`createSetAtom`", "`createAtomSignal`"],
};

function read(path) {
  return readFileSync(path, "utf8");
}

function collectMarkdown(path) {
  const stat = statSync(path);
  if (stat.isFile()) return /\.mdx?$/.test(path) ? [path] : [];
  return readdirSync(path).flatMap((entry) => collectMarkdown(join(path, entry)));
}

function documentedReactMajors(range) {
  const bounds = range.match(/\d+/g)?.map(Number) ?? [];
  expect(bounds).toHaveLength(2);
  return Array.from({ length: bounds[1] - bounds[0] }, (_, index) => bounds[0] + index);
}

function chooserRow(markdown, framework) {
  const row = markdown.split("\n").find((line) => line.trimStart().startsWith(`| ${framework} `));
  expect(typeof row).toBe("string");
  return row ?? "";
}

function readReference(locale, slug) {
  const directory = locale === "zh" ? "reference" : "en/reference";
  return read(join(docsRoot, "src/content/docs", directory, `${slug}.md`));
}

const packageReadmes = readdirSync(join(repoRoot, "packages"))
  .map((directory) => join(repoRoot, "packages", directory, "README.md"))
  .filter(existsSync);
const currentDocumentation = [
  join(repoRoot, "README.md"),
  join(repoRoot, "docs/guide/README.en.md"),
  ...packageReadmes,
  ...collectMarkdown(join(repoRoot, "docs/guide")),
  ...collectMarkdown(join(docsRoot, "src/content/docs")),
  ...collectMarkdown(join(repoRoot, "skills")),
];

describe("React Native / Expo framework integration guard", () => {
  it("keeps adapter ranges and exports derived from package manifests", () => {
    for (const guide of guides) {
      const manifest = JSON.parse(read(join(repoRoot, "packages", guide.slug, "package.json")));
      const range = manifest.peerDependencies?.[guide.peerPackage];
      expect(typeof range).toBe("string");

      for (const locale of ["zh", "en"]) {
        const markdown = readGuide(locale, guide.slug);
        const reference = readReference(locale, guide.slug);
        expect(markdown).toContain(range);
        const referenceRange =
          guide.slug === "react"
            ? documentedReactMajors(range)
                .map((major) => `React ${major}`)
                .join(locale === "zh" ? " 和 " : " and ")
            : range;
        expect(reference).toContain(referenceRange);
        for (const exportName of guide.adapterExports) {
          expect(markdown).toContain(exportName);
          expect(reference).toContain(exportName);
        }
      }
    }
  });

  it("locks every framework chooser row and shared principle", () => {
    for (const locale of ["zh", "en"]) {
      const chooser = readChooser(locale);
      for (const [framework, phrases] of Object.entries(chooserContracts)) {
        const row = chooserRow(chooser, framework);
        for (const phrase of phrases) expect(row).toContain(phrase);
      }
      expect(chooser).toContain("Object.is");
      expect(chooser).toContain("Core");
      expect(chooser).toContain("SSR");
      expect(chooser).toMatch(locale === "zh" ? /不可变/ : /immutab(?:le|ly)/);
    }
  });

  it("keeps sidebar, Vue SSR, and framework skill contracts", () => {
    const sidebarSource = JSON.stringify(sidebar);
    for (const slug of ["preact", "svelte", "vue", "solid"]) {
      expect(sidebarSource).toContain(`reference/${slug}`);
    }
    expect(sidebarSource).toContain("guides/framework-adapters");
    expect(sidebarSource).toContain("guides/react-native-expo");

    const chineseVueGuide = readGuide("zh", "vue");
    const chineseVueReference = readReference("zh", "vue");
    expect(chineseVueGuide).toContain("不会建立 Core 订阅");
    expect(chineseVueGuide).not.toMatch(/(?<!不)会建立 Core 订阅/u);
    for (const phrase of [
      "每个请求",
      "createSSRApp",
      "renderToString",
      "只读取 `atom.get()` snapshot",
      "不安装 Core watcher",
      "只有客户端活动 effect scope 中的读取 API 才会订阅 Core",
      "scope cleanup 自动释放",
      "onScopeDispose",
    ])
      expect(chineseVueReference).toContain(phrase);
    expect(chineseVueReference).not.toContain("renderToString` 完成后会停止组件 scope");

    const englishVueGuide = readGuide("en", "vue");
    const englishVueReference = readReference("en", "vue");
    expect(englishVueGuide).toContain("does not install a Core subscription");
    expect(englishVueGuide).not.toContain("does install a Core subscription");
    for (const phrase of [
      "per request",
      "createSSRApp",
      "renderToString",
      "only reads an `atom.get()` snapshot",
      "does not install a Core watcher",
      "Only read APIs in an active client effect scope subscribe to Core",
      "scope cleanup registered with `onScopeDispose` releases them",
    ])
      expect(englishVueReference).toContain(phrase);
    expect(englishVueReference).not.toContain(
      "renderToString` provides the active component scope and stops that scope after rendering",
    );

    const frameworkSkill = read(join(repoRoot, "skills/zhuangtai-framework-adapters/SKILL.md"));
    for (const phrase of [
      "@zhuangtai-js/preact",
      "@zhuangtai-js/svelte",
      "@zhuangtai-js/vue",
      "@zhuangtai-js/solid",
      "per request",
      "Object.is",
    ])
      expect(frameworkSkill).toContain(phrase);
  });

  it("derives React support from its peer range and rejects stale claims", () => {
    const manifest = JSON.parse(read(join(repoRoot, "packages/react/package.json")));
    const range = manifest.peerDependencies?.react;
    expect(typeof range).toBe("string");
    expect(readGuide("zh", "react")).toContain(`React ${range}`);
    expect(readGuide("en", "react")).toContain(`React ${range}`);

    const support = documentedReactMajors(range)
      .map((major) => `React ${major}`)
      .join(" and ");
    expect(read(join(repoRoot, "skills/zhuangtai-react/SKILL.md"))).toContain(support);
    for (const path of currentDocumentation) {
      expect(read(path)).not.toMatch(
        /React 18\+|React 18 (?:and|or) later|React 18\s*(?:及以上|或更高)/u,
      );
    }
  });
});
