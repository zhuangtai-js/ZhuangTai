---
title: ZhuàngTài 状态
description: 简单、直接的 JavaScript 状态原语。
template: splash
hero:
  title: ZhuàngTài 状态
  tagline: 简单、直接的 JavaScript 状态原语。用同步、可预测的小原语管理状态，不把调度藏进核心。
  actions:
    - text: 快速开始
      link: /getting-started/
      icon: right-arrow
      variant: primary
    - text: 在 GitHub 查看
      link: https://github.com/zhuangtai-js/ZhuangTai
      icon: external
      variant: minimal
---

ZhuàngTài 面向需要清晰状态语义的 JavaScript 和 TypeScript 项目。核心包只提供 `atom`、`computed` 和插件入口；框架适配、持久化等能力放在独立包中。

## 为什么选择 ZhuàngTài？

- **同步直达。** `set()` 立即更新，`watch()` 同步触发，没有隐藏的批处理或延迟调度。
- **小而明确。** `@zhuangtai-js/core` 没有第三方运行时依赖，核心 API 保持少量且直接。
- **可组合。** 使用 `createAtom()` 安装插件；默认 `atom()` 保持干净，不受插件影响。
- **适合做底层原语。** 你可以直接使用它，也可以在它之上构建框架适配器或领域状态层。

## 安装

```sh
pnpm add @zhuangtai-js/core
```

需要持久化时再安装插件：

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 从这里开始

- [快速开始](/getting-started/)：安装、创建状态、监听变化、添加持久化。
- [Core 参考](/reference/core/)：查看 `atom()`、`computed()`、`createAtom()` 和核心类型。
- [Persist 参考](/reference/persist/)：查看持久化插件、storage 和 codec 选项。

## 当前包

- `@zhuangtai-js/core`：框架无关的状态核心。
- `@zhuangtai-js/persist`：为 `createAtom()` 创建的 atom 添加同步持久化。

未来的框架适配器会作为独立包发布。
