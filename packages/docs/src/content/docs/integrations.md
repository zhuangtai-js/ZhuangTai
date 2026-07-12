---
title: 集成与兼容性
sidebar:
  label: 集成与兼容性
  order: 6
description: 了解 ZhuàngTài 在 JavaScript、TypeScript、React 与常见框架中的使用方式和边界。
---

ZhuàngTài Core 不依赖 UI 框架。你可以在普通 JavaScript、组件库、SDK 或框架应用中直接创建和订阅状态；需要框架生命周期集成时，再选择对应 adapter。

## 支持概览

| 环境                 | 支持情况        | 使用建议                                                                |
| -------------------- | --------------- | ----------------------------------------------------------------------- |
| Vanilla ESM          | 官方支持        | 直接使用 `@zhuangtai-js/core`；Core 没有第三方运行时依赖                |
| TypeScript           | 官方支持        | 所有公开包都提供类型声明                                                |
| React 18 / 19        | 官方支持        | 使用 `@zhuangtai-js/react` 的 `useAtom`、`useAtomValue` 与 `useSetAtom` |
| Vite                 | 可直接使用      | Vanilla 与 React 项目都可按标准 ESM 方式引入                            |
| Astro                | 可直接使用      | 在 React 岛中使用 React adapter，或在普通脚本中直接使用 Core            |
| Next.js              | 需注意 SSR 边界 | 客户端组件可使用 React adapter；服务端状态应按请求隔离                  |
| Vue / Svelte / Solid | Core 可用       | 可通过 `get`、`set`、`watch` 手动接入；暂时没有官方 adapter             |
| Node.js ESM          | 可直接使用      | 使用 `import` 引入，适合 SDK、服务状态与工具代码                        |
| React Native / Expo  | 尚无官方指南    | API 不依赖 DOM，但当前没有专门的官方集成指南                            |
| Bun / Deno           | 尚无官方指南    | ESM API 具备可移植性，但当前没有正式运行时支持承诺                      |
| CommonJS `require`   | 不支持          | 发布包为 ESM-only，请使用 `import`                                      |

## React 与 Astro

在 Astro 中使用 React 岛时，组件内部与普通 React 应用相同：

```astro
---
import Counter from "../components/Counter.tsx";
---

<Counter client:load />
```

`Counter.tsx` 中可以直接使用 `@zhuangtai-js/react`。如果页面不需要 React，也可以在普通模块或脚本中使用 Core 的 `atom` 与 `watch`。

## Next.js 与服务端渲染

React adapter 使用 `useSyncExternalStore` 接入 React。客户端组件可以采用常规方式使用，但 SSR 应用还需要决定状态属于谁：

- 页面内共享状态可以在客户端模块中创建。
- 与请求或用户相关的可变状态应按请求创建，不能让所有请求共享同一个 module-level atom。
- 需要持久化时，只在浏览器环境访问 `localStorage` 等客户端 API。

完整的 Next.js 专项指南仍在规划中。在此之前，请把请求隔离当成应用架构的一部分，而不是由全局 atom 自动处理。
