---
title: 完整示例
sidebar:
  label: 完整示例
  order: 4
description: 从可运行的 Vite Vanilla 与 React 工程开始使用 ZhuàngTài。
---

示例不是复制到文档里的代码片段，而是进入 workspace、安装依赖、执行类型检查并在 CI 中完成生产构建的真实工程。

## Vite Vanilla

适合先理解 Core：一个计数器、一个 `computed` 派生值和一条同步 `watch` 时间线。

```sh
pnpm install
pnpm --filter @zhuangtai-js/example-vite-vanilla dev
```

源码位于 [`examples/vite-vanilla`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-vanilla)。生产构建：

```sh
pnpm --filter @zhuangtai-js/example-vite-vanilla build
```

## Vite React

展示 Core atom 如何保持在组件外部，并通过 `useAtom`、`useAtomValue` 和 `useSetAtom` 接入 React 18/19。

```sh
pnpm install
pnpm --filter @zhuangtai-js/example-vite-react dev
```

源码位于 [`examples/vite-react`](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-react)。

## 为什么先做这两个

它们覆盖最短采用路径：Vanilla 证明 Core 不依赖 UI 框架，React 示例证明 adapter 可以提供熟悉的组件体验。Next.js 等 SSR 框架需要额外验证 hydration 与请求隔离，因此会在专门 fixture 完成后再标记为已验证。

想先快速观察语义，请打开 [State Lab](/playground/)；想了解环境支持程度，请查看[集成与兼容性](/integrations/)。
