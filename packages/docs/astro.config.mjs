import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  redirects: {
    "/compare": "/why-zhuangtai/",
    "/benchmarks": "/why-zhuangtai/",
    "/roadmap": "/integrations/",
    "/en/compare": "/en/why-zhuangtai/",
    "/en/benchmarks": "/en/why-zhuangtai/",
    "/en/roadmap": "/en/integrations/",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://zhuangtai.yojigen.cn",
  integrations: [
    react(),
    starlight({
      title: "ZhuàngTài 状态",
      description: "简单、直接的 JavaScript 状态原语。",
      customCss: ["./src/styles/tailwind.css"],
      components: {
        Search: "./src/components/Search.astro",
      },
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
          slug: "why-zhuangtai",
          label: "为什么是 ZhuàngTài",
          translations: {
            en: "Why ZhuàngTài",
          },
        },
        {
          slug: "playground",
          label: "在线示例",
          translations: {
            en: "Interactive Examples",
          },
        },
        {
          slug: "examples",
          label: "完整示例",
          translations: {
            en: "Complete Examples",
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
          label: "生态",
          translations: {
            en: "Ecosystem",
          },
          items: [
            {
              slug: "integrations",
              label: "集成与兼容性",
              translations: {
                en: "Integrations & Compatibility",
              },
            },
            {
              slug: "showcase",
              label: "Showcase",
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
