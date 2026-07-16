import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export const site = "https://zhuangtai.yojigen.cn";

const docsRoot = process.cwd();
const distRoot = join(docsRoot, "dist");

export const pagePairs = [
  {
    key: "home",
    schemaType: "SoftwareSourceCode",
    zh: {
      file: "index.html",
      path: "/",
      lang: "zh-CN",
      title: "ZhuàngTài 状态",
      description:
        "简单、直接的 JavaScript 状态原语。用同步、可预测的小原语管理状态，不把调度藏进核心。",
    },
    en: {
      file: "en/index.html",
      path: "/en/",
      lang: "en",
      title: "ZhuàngTài State",
      description:
        "Simple, direct state primitives for JavaScript. Manage state with small, synchronous, predictable primitives without hidden scheduling in the core.",
    },
  },
  {
    key: "framework",
    schemaType: "TechArticle",
    zh: {
      file: "guides/framework-adapters/index.html",
      path: "/guides/framework-adapters/",
      lang: "zh-CN",
      title: "选择框架适配器",
      description:
        "用一页选择 React、Preact、Vue、Svelte、Solid，或在 React Native / Expo 中使用 React adapter，并快速进入对应指南。",
    },
    en: {
      file: "en/guides/framework-adapters/index.html",
      path: "/en/guides/framework-adapters/",
      lang: "en",
      title: "Choose a framework adapter",
      description:
        "Choose the ZhuàngTài adapter for React, Preact, Vue, Svelte, or Solid, or use the React adapter in React Native / Expo.",
    },
  },
  {
    key: "react",
    schemaType: "TechArticle",
    zh: {
      file: "guides/react/index.html",
      path: "/guides/react/",
      lang: "zh-CN",
      title: "React 快速指南",
      description: "用 @zhuangtai-js/react 在 React 组件中读写同步 atom，并保持清晰的订阅边界。",
    },
    en: {
      file: "en/guides/react/index.html",
      path: "/en/guides/react/",
      lang: "en",
      title: "React quick start",
      description:
        "Read and write synchronous atoms with @zhuangtai-js/react while keeping subscription boundaries explicit.",
    },
  },
  {
    key: "expo",
    schemaType: "TechArticle",
    zh: {
      file: "guides/react-native-expo/index.html",
      path: "/guides/react-native-expo/",
      lang: "zh-CN",
      title: "在 React Native / Expo 中使用",
      description:
        "在 React Native 或 Expo 中直接使用 ZhuàngTài，并用通用异步 storage 持久化偏好。",
    },
    en: {
      file: "en/guides/react-native-expo/index.html",
      path: "/en/guides/react-native-expo/",
      lang: "en",
      title: "Using with React Native / Expo",
      description:
        "Use ZhuàngTài directly in React Native or Expo and persist preferences with generic asynchronous storage.",
    },
  },
  {
    key: "persist",
    schemaType: "TechArticle",
    zh: {
      file: "reference/persist/index.html",
      path: "/reference/persist/",
      lang: "zh-CN",
      title: "Persist 参考",
      description:
        "@zhuangtai-js/persist 的同步与异步 storage、hydration、controller、codec、版本迁移与错误语义。",
    },
    en: {
      file: "en/reference/persist/index.html",
      path: "/en/reference/persist/",
      lang: "en",
      title: "Persist Reference",
      description:
        "Synchronous and asynchronous storage, hydration, lifecycle controls, codecs, version migration, and failure semantics for @zhuangtai-js/persist.",
    },
  },
  {
    key: "ai",
    schemaType: "TechArticle",
    zh: {
      file: "ai/index.html",
      path: "/ai/",
      lang: "zh-CN",
      title: "AI 友好",
      description: "给人类和模型都更容易读、查、接入的 ZhuàngTài 文档入口。",
    },
    en: {
      file: "en/ai/index.html",
      path: "/en/ai/",
      lang: "en",
      title: "AI Friendly",
      description:
        "A ZhuàngTài entry point that is easier for people and models to read, search, and plug into.",
    },
  },
];

export const representativePages = pagePairs.flatMap((pair) => [
  { ...pair.zh, key: `${pair.key}-zh`, schemaType: pair.schemaType },
  { ...pair.en, key: `${pair.key}-en`, schemaType: pair.schemaType },
]);

export const frameworkGuideFiles = [
  "guides/framework-adapters/index.html",
  "guides/react/index.html",
  "guides/react-native-expo/index.html",
  "guides/preact/index.html",
  "guides/vue/index.html",
  "guides/svelte/index.html",
  "guides/solid/index.html",
  "en/guides/framework-adapters/index.html",
  "en/guides/react/index.html",
  "en/guides/react-native-expo/index.html",
  "en/guides/preact/index.html",
  "en/guides/vue/index.html",
  "en/guides/svelte/index.html",
  "en/guides/solid/index.html",
];

export function readBuiltFile(relativePath) {
  const path = join(distRoot, relativePath);
  if (!existsSync(path)) throw new Error(`Missing generated docs file: ${relativePath}`);
  return readFileSync(path, "utf8");
}

export function parseHtml(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

export function readPageDocument(page) {
  return parseHtml(readBuiltFile(page.file));
}

export function readSitemapUrls() {
  const index = readBuiltFile("sitemap-index.xml");
  const sitemapFiles = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    basename(new URL(match[1]).pathname),
  );
  return new Set(
    sitemapFiles.flatMap((file) =>
      [...readBuiltFile(file).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
    ),
  );
}

export function readJsonLd(document) {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) =>
    JSON.parse(script.textContent ?? ""),
  );
}

export function jsonLdUrlErrors(value, path = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => jsonLdUrlErrors(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== "object") return [];

  const errors = [];
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${path}.${key}`;
    if (["@id", "url", "image", "mainEntityOfPage", "item"].includes(key)) {
      if (typeof item !== "string" || !item.startsWith(`${site}/`)) {
        errors.push(`${itemPath} is not an absolute ZhuàngTài URL`);
      }
    }
    errors.push(...jsonLdUrlErrors(item, itemPath));
  }
  return errors;
}
