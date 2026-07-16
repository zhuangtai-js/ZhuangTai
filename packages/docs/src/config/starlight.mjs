import starlightLlmsTxt from "starlight-llms-txt";
import { llmsDetails } from "./llms-details.mjs";
import { sidebar } from "./sidebar.mjs";

export const starlightConfig = {
  title: "ZhuàngTài 状态",
  description: "简单、直接的 JavaScript 状态原语。",
  routeMiddleware: "./src/route-data.ts",
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
  sidebar,
  plugins: [
    starlightLlmsTxt({
      details: llmsDetails,
    }),
  ],
};
