---
title: 集成与兼容性
sidebar:
  label: 集成与兼容性
  order: 6
description: 区分官方支持、已验证兼容、Core 可用、尚未验证和不支持。
---

我们只对有明确实现或自动化 fixture 的环境给出“官方支持”或“已验证”结论。框架能打包 ESM，不等于 SSR、hydration、请求隔离和生命周期行为已经得到验证。

## 支持等级

- **官方支持**：有维护中的公共 API、文档、测试与发布承诺。
- **已验证兼容**：有真实 fixture 或消费者测试进入 CI，但不一定有专用 adapter。
- **Core 可用**：框架无关 API 可以手动接入，但没有对应 adapter 与完整 fixture。
- **尚未验证**：没有足够证据，不作兼容承诺。
- **不支持**：当前包格式或 API 明确不能使用。

| 环境                 | 等级       | 证据与边界                                                      |
| -------------------- | ---------- | --------------------------------------------------------------- |
| Vanilla ESM          | 官方支持   | Core 零第三方运行时依赖；Vite Vanilla 示例进入 workspace 与 CI  |
| TypeScript           | 官方支持   | 源码、声明构建、API 类型测试与严格类型检查                      |
| React 18/19          | 官方支持   | `@zhuangtai-js/react` peer range、adapter 测试、Vite React 示例 |
| Chromium             | 已验证兼容 | Playwright browser tests                                        |
| Node.js ESM          | 已验证兼容 | NodeNext packed consumer；CI 当前使用 Node.js 24                |
| Vite                 | 已验证兼容 | Vanilla 与 React production fixtures                            |
| Astro                | Core 可用  | Docs 自身可打包 Core，但尚无面向用户的 Astro fixture 或 adapter |
| Next.js              | 尚未验证   | 尚缺 hydration、request isolation、streaming SSR fixture        |
| Vue / Svelte / Solid | Core 可用  | 可手动订阅；没有官方 adapter 或 fixture                         |
| React Native / Expo  | 尚未验证   | 没有设备或 bundler fixture                                      |
| Bun / Deno           | 尚未验证   | 没有运行时矩阵                                                  |
| CommonJS `require`   | 不支持     | 发布包是 ESM-only，仅提供 `import` export                       |

## 关于 SSR 的精确说明

React adapter 为 `useSyncExternalStore` 的服务端快照读取复用同步 `get()`。这说明 adapter 有服务端读取路径，但**不单独证明** Next.js App Router、hydration 一致、请求级状态隔离或 streaming SSR 已得到支持。

在 SSR 应用中，把可变 module-level atom 作为所有请求共享状态可能造成跨请求数据泄漏。专用 Next.js fixture 完成前，请按请求创建状态，并把该环境视为“尚未验证”。

如果你愿意贡献 fixture，请先阅读[贡献指南](https://github.com/zhuangtai-js/ZhuangTai/blob/main/CONTRIBUTING.md)。
