import starlightLlmsTxt from "starlight-llms-txt";
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
      details: `重要上下文：

- Preact、Svelte、Vue 与 Solid 使用各自的官方 adapter；adapter 保留 Core 的同步 \`watch\`、\`Object.is\` 与不可变更新边界。
- 为每个 SSR 请求创建独立的可变 atom/store，避免跨请求共享可变状态。Preact 服务端读取 snapshot 而不订阅；Vue SSR 的 \`renderToString\` 路径只读取 \`atom.get()\` snapshot、不安装 Core watcher，只有客户端活动 effect scope 中的读取 API 才订阅并由 scope cleanup 释放；Svelte store 与 Solid owner 仍需遵守各自生命周期。
- 不需要框架渲染生命周期或响应式桥接时直接使用 Core；框架组件内需要自动重渲染和生命周期清理时使用 adapter。
- Persist migration 的输入来自 storage，始终视为 \`unknown\`，先解析并收窄；migration 按版本同步、逐步执行；durable write 失败时不提交新的内存状态。
- 四个 adapter 是 \`@zhuangtai-js/preact\`、\`@zhuangtai-js/svelte\`、\`@zhuangtai-js/vue\` 和 \`@zhuangtai-js/solid\`；\`skills/\` 提供四个 Agent Skills：\`zhuangtai\`、\`zhuangtai-react\`、\`zhuangtai-plugins\` 和 \`zhuangtai-framework-adapters\`。

English mirror:

- Preact, Svelte, Vue, and Solid use their official adapters. Adapters preserve Core's synchronous \`watch\`, \`Object.is\`, and immutable-update boundaries.
- Create an independent mutable atom/store per SSR request and never share mutable state across requests. Vue SSR \`renderToString\` only reads an \`atom.get()\` snapshot and does not install a Core watcher; only read APIs in an active client effect scope subscribe, and scope cleanup releases them. Preact reads a server snapshot without subscribing; Svelte stores and Solid owners still follow their native lifecycle.
- Use Core directly when you do not need framework rendering lifecycle or reactive bridging; use an adapter inside framework components when you need automatic re-rendering and lifecycle cleanup.
- Persist migration input comes from storage and is always \`unknown\`; parse and narrow it first. Run migrations synchronously, one version at a time; if the durable write fails, do not commit new in-memory state.
- The four adapters are \`@zhuangtai-js/preact\`, \`@zhuangtai-js/svelte\`, \`@zhuangtai-js/vue\`, and \`@zhuangtai-js/solid\`; \`skills/\` provides four Agent Skills: \`zhuangtai\`, \`zhuangtai-react\`, \`zhuangtai-plugins\`, and \`zhuangtai-framework-adapters\`.`,
    }),
  ],
};
