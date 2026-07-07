import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://zhuangtai.yojigen.cn",
  integrations: [
    starlight({
      title: "ZhuàngTài 状态",
      description: "简单、直接的 JavaScript 状态原语。",
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
              slug: "reference/persist",
              label: "Persist",
            },
            {
              slug: "reference/react",
              label: "React",
            },
          ],
        },
      ],
    }),
  ],
});
