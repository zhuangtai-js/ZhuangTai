---
title: 集成与兼容性
sidebar:
  label: 集成与兼容性
  order: 6
description: 了解 ZhuàngTài 在 JavaScript、TypeScript、React 与常见框架中的使用方式和边界。
---

ZhuàngTài Core 不依赖 UI 框架。你可以在普通 JavaScript、组件库、SDK 或框架应用中直接创建和订阅状态；需要框架生命周期集成时，再选择对应 adapter。

## 支持概览

| 环境                 | 推荐方式        | 注意事项                                                                |
| -------------------- | --------------- | ----------------------------------------------------------------------- |
| Vanilla ESM          | 使用 Core       | 直接引入 `@zhuangtai-js/core`；Core 没有第三方运行时依赖                |
| TypeScript           | 直接使用        | 所有公开包都提供类型声明                                                |
| React 18 / 19        | 使用 React 包   | 使用 `@zhuangtai-js/react` 的 `useAtom`、`useAtomValue` 与 `useSetAtom` |
| Vite                 | 标准 ESM 引入   | Vanilla 与 React 项目都可以直接使用                                     |
| Astro                | React 岛或 Core | 在 React 岛中使用 React adapter，普通脚本中直接使用 Core                |
| Next.js              | 客户端组件接入  | 使用 React adapter，并按请求隔离服务端状态                              |
| Vue / Svelte / Solid | Core API 接入   | 通过 `get`、`set`、`watch` 连接框架生命周期                             |
| Node.js ESM          | 使用 Core       | 适合 SDK、服务状态与工具代码                                            |
| CommonJS 项目        | 通过 ESM 引入   | 发布包采用 ESM-only 格式，请使用 `import`                               |

## Next.js 与服务端渲染

React adapter 使用 `useSyncExternalStore` 接入 React。客户端组件可以采用常规方式使用，但 SSR 应用还需要决定状态属于谁：

- 页面内共享状态可以在客户端模块中创建。
- 与请求或用户相关的可变状态应按请求创建，不能让所有请求共享同一个 module-level atom。
- 需要持久化时，只在浏览器环境访问 `localStorage` 等客户端 API。

这些隔离原则适用于所有服务端渲染环境：全局状态适合应用级常量或客户端共享状态，请求相关的可变状态应由请求生命周期持有。
