import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  site: "https://zhuangtai.yojigen.cn",
  integrations: [
    starlight({
      title: "ZhuàngTài 状态",
      description: "简单、直接的 JavaScript 状态原语。",
      editLink: {
        baseUrl: "https://github.com/zhuangtai-js/ZhuangTai/edit/main/packages/docs/",
      },
      lastUpdated: true,
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://zhuangtai.yojigen.cn/og.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://zhuangtai.yojigen.cn/og.png",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/zhuangtai-js/ZhuangTai",
        },
      ],
      defaultLocale: "root",
      locales: {
        root: {
          label: "简体中文",
          lang: "zh-CN",
        },
        en: {
          label: "English",
          lang: "en",
        },
      },
      sidebar: [
        {
          slug: "getting-started",
          label: "快速开始",
          translations: {
            en: "Getting Started",
          },
        },
        {
          slug: "philosophy",
          label: "设计理念",
          translations: {
            en: "Philosophy",
          },
        },
        {
          label: "指南",
          translations: {
            en: "Guides",
          },
          items: [
            {
              slug: "guides/core-concepts",
              label: "核心概念",
              translations: {
                en: "Core Concepts",
              },
            },
            {
              slug: "guides/plugins",
              label: "插件与组合",
              translations: {
                en: "Plugins & Composition",
              },
            },
            {
              slug: "guides/react",
              label: "React 用法",
              translations: {
                en: "Using with React",
              },
            },
          ],
        },
        {
          label: "参考",
          translations: {
            en: "Reference",
          },
          items: [
            {
              slug: "reference/core",
              label: "Core",
            },
            {
              slug: "reference/freeze",
              label: "Freeze",
            },
            {
              slug: "reference/immer",
              label: "Immer",
            },
            {
              slug: "reference/persist",
              label: "Persist",
            },
            {
              slug: "reference/react",
              label: "React",
            },
            {
              slug: "reference/sync",
              label: "Sync",
            },
          ],
        },
        {
          slug: "ai",
          label: "AI 友好",
          translations: {
            en: "AI Friendly",
          },
        },
      ],
      plugins: [starlightLlmsTxt()],
    }),
  ],
});
