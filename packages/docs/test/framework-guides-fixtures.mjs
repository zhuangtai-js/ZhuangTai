import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {"zh" | "en"} Locale */
/**
 * @typedef {{
 *   slug: string;
 *   packageName: string;
 *   peerPackage: string;
 *   peerPattern: RegExp;
 *   adapterExports: string[];
 *   referencePath: string;
 * }} GuideFixture
 */

const docsRoot = fileURLToPath(new URL("../src/content/docs/", import.meta.url));
const expectedHeadings = {
  zh: [
    "要求与安装",
    "最小计数器",
    "放置 state module",
    "选择读取与写入方式",
    "生命周期与 SSR 边界",
    "持久化",
    "API 参考",
    "下一步",
  ],
  en: [
    "Requirements and install",
    "Minimal counter",
    "Place the state module",
    "Choose read and write access",
    "Lifecycle and SSR boundary",
    "Persistence",
    "API reference",
    "Next steps",
  ],
};

/** @type {GuideFixture[]} */
export const guides = [
  {
    slug: "react",
    packageName: "@zhuangtai-js/react",
    peerPackage: "react",
    peerPattern: /React\s+>=18\s+<20/,
    adapterExports: ["useAtomValue", "useSetAtom", "useAtom"],
    referencePath: "/reference/react/",
  },
  {
    slug: "preact",
    packageName: "@zhuangtai-js/preact",
    peerPackage: "preact",
    peerPattern: /Preact\s+>=10\.9\s+<11/,
    adapterExports: [
      "useAtomValue",
      "useSetAtom",
      "useAtom",
      "createAtomHook",
      "createComputedHook",
    ],
    referencePath: "/reference/preact/",
  },
  {
    slug: "vue",
    packageName: "@zhuangtai-js/vue",
    peerPackage: "vue",
    peerPattern: /Vue\s+>=3\.2\s+<4/,
    adapterExports: ["useAtomValue", "useSetAtom", "useAtom"],
    referencePath: "/reference/vue/",
  },
  {
    slug: "svelte",
    packageName: "@zhuangtai-js/svelte",
    peerPackage: "svelte",
    peerPattern: /Svelte\s+>=4\.2\s+<6/,
    adapterExports: ["toReadable", "toWritable"],
    referencePath: "/reference/svelte/",
  },
  {
    slug: "solid",
    packageName: "@zhuangtai-js/solid",
    peerPackage: "solid-js",
    peerPattern: /Solid\s+>=1\.5\s+<2/,
    adapterExports: ["createAtomValue", "createSetAtom", "createAtomSignal"],
    referencePath: "/reference/solid/",
  },
];

/** @param {Locale} locale @param {string} slug */
export function guidePath(locale, slug) {
  return join(docsRoot, locale === "zh" ? "guides" : "en/guides", `${slug}.md`);
}

/** @param {Locale} locale @param {string} slug */
export function readGuide(locale, slug) {
  return readFileSync(guidePath(locale, slug), "utf8");
}

/** @param {Locale} locale */
export function readChooser(locale) {
  const directory = locale === "zh" ? "guides" : "en/guides";
  return readFileSync(join(docsRoot, directory, "framework-adapters.md"), "utf8");
}

/** @param {string} markdown */
function stripFrontmatter(markdown) {
  return markdown.replace(/^---[\s\S]*?---\s*/, "");
}

/** @param {string} markdown */
export function extractHeadings(markdown) {
  const headings = [];
  let inFence = false;

  for (const line of stripFrontmatter(markdown).split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }

    if (!inFence) {
      const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (match) headings.push({ level: match[1].length, text: match[2] });
    }
  }

  return headings;
}

/** @param {string} markdown */
function firstBodyLine(markdown) {
  return (
    stripFrontmatter(markdown)
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ""
  );
}

/** @param {Locale} locale @param {GuideFixture} guide @param {string} markdown */
export function guideErrors(locale, guide, markdown) {
  const errors = [];
  const install = `pnpm add @zhuangtai-js/core ${guide.packageName} ${guide.peerPackage}`;
  const persistPath = locale === "zh" ? "/reference/persist/" : "/en/reference/persist/";

  if (!firstBodyLine(markdown).includes(guide.packageName)) {
    errors.push("the first body line is not a one-line fit statement");
  }
  if (!markdown.includes("@zhuangtai-js/core")) errors.push("missing @zhuangtai-js/core");
  if (!markdown.includes(guide.packageName)) errors.push(`missing ${guide.packageName}`);
  if (!guide.peerPattern.test(markdown)) errors.push("missing peer range");
  if (!markdown.includes(install)) errors.push(`missing install command: ${install}`);
  for (const exportName of guide.adapterExports) {
    if (!markdown.includes(exportName)) errors.push(`missing public export: ${exportName}`);
  }
  if (!/\.\.\.|\.map\(|\.filter\(/.test(markdown)) errors.push("missing immutable updater syntax");
  if (!markdown.includes(persistPath)) errors.push(`missing persistence reference: ${persistPath}`);
  if (!markdown.includes(guide.referencePath)) {
    errors.push(`missing API reference: ${guide.referencePath}`);
  }

  const stalePackage = /@zhuangtai\/(?!js-)/.exec(markdown);
  if (stalePackage) errors.push(`stale package name: ${stalePackage[0]}`);
  return errors;
}

/** @param {GuideFixture} guide @param {string} zh @param {string} en */
export function verifyGuidePair(guide, zh, en) {
  const errors = [
    ...guideErrors("zh", guide, zh).map((error) => `zh: ${error}`),
    ...guideErrors("en", guide, en).map((error) => `en: ${error}`),
  ];
  const zhHeadings = extractHeadings(zh);
  const enHeadings = extractHeadings(en);

  if (zhHeadings.map(({ text }) => text).join("|") !== expectedHeadings.zh.join("|")) {
    errors.push(`zh heading structure mismatch: ${zhHeadings.map(({ text }) => text).join(" | ")}`);
  }
  if (enHeadings.map(({ text }) => text).join("|") !== expectedHeadings.en.join("|")) {
    errors.push(`en heading structure mismatch: ${enHeadings.map(({ text }) => text).join(" | ")}`);
  }
  if (
    zhHeadings.map(({ level }) => level).join(",") !==
    enHeadings.map(({ level }) => level).join(",")
  ) {
    errors.push("heading parity mismatch between zh and en");
  }
  if (errors.length > 0) {
    throw new Error(`${guide.slug} guide consistency failed:\n- ${errors.join("\n- ")}`);
  }
}

/** @param {Locale} locale @param {string} markdown */
export function chooserErrors(locale, markdown) {
  const errors = [];
  for (const guide of guides) {
    if (!markdown.includes(guide.packageName))
      errors.push(`missing chooser package ${guide.packageName}`);
    const path = locale === "zh" ? `/guides/${guide.slug}/` : `/en/guides/${guide.slug}/`;
    if (!markdown.includes(path)) errors.push(`missing chooser link ${path}`);
  }
  if (!markdown.includes("Object.is")) errors.push("missing Object.is principle");
  if (!/immutab(?:le|ly)/.test(markdown) && !markdown.includes("不可变")) {
    errors.push("missing immutable update principle");
  }
  return errors;
}
