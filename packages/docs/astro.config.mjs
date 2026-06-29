import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    starlight({
      title: "ZhuàngTài 状态",
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
          label: "指南",
          translations: {
            en: "Guides",
          },
          items: [
            {
              slug: "getting-started",
              label: "快速开始",
              translations: {
                en: "Getting Started",
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
              slug: "reference/persist",
              label: "Persist",
            },
          ],
        },
      ],
    }),
  ],
});
