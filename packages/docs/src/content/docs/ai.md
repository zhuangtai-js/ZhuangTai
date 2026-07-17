---
title: AI 友好
description: 给人类和模型都更容易读、查、接入的 ZhuàngTài 文档入口。
---

ZhuàngTài 把 AI 代理需要的包选择、框架入口和异步持久化边界集中在这里。公开文档以中文为主，英文页面镜像相同语义。

## llms 输出

- `https://zhuangtai.yojigen.cn/llms.txt`：站点索引和关键约束。
- `https://zhuangtai.yojigen.cn/llms-small.txt`：较小上下文。
- `https://zhuangtai.yojigen.cn/llms-full.txt`：完整文档上下文。

## 框架选择

在 UI 或组件生命周期之外直接使用 `@zhuangtai-js/core`。在组件内选择对应的 framework adapter；React Native / Expo 使用 `@zhuangtai-js/react`，不需要原生专用 adapter。

- [React](/guides/react/) / [English](/en/guides/react/)
- [Preact](/guides/preact/) / [English](/en/guides/preact/)
- [Vue](/guides/vue/) / [English](/en/guides/vue/)
- [Svelte](/guides/svelte/) / [English](/en/guides/svelte/)
- [Solid](/guides/solid/) / [English](/en/guides/solid/)
- [React Native / Expo](/guides/react-native-expo/) / [English](/en/guides/react-native-expo/)

Core 的 `set` 立即生效，`watch` 同步执行，等价性使用 `Object.is`；对象和数组需要 immutable 更新。adapter 不添加隐藏调度、批处理或事务。

## 异步 Persist 决策

- `PersistStorage` 是结构契约。`getItem`、`setItem`、`removeItem` 返回普通值或 `PromiseLike` 都结构兼容。
- AsyncStorage 只由使用方传给 `@zhuangtai-js/persist`；不存在 ZhuàngTài 专用 AsyncStorage 包。
- 如果用内存回退包装 storage，必须按每次调用保留同步值或 `PromiseLike` 返回形状；异步 `getItem` 在完成后再校验和缓存，异步 `setItem` / `removeItem` 要观察 rejection 后再切换回退，不能直接丢弃 Promise。
- 如果首屏依赖 hydration 后的持久化状态，先 `await persist.ready(atom)`，再展示依赖该状态的 UI。
- 在退出、提交或其他持久化边界执行 `await persist.flush(atom)`，并处理 rejection/错误；不要假设同步 `set` 已代表异步 durable write 完成。
- `persist.rehydrate(atom)` 重新读取 storage，`persist.clear(atom)` 删除持久化值。用 `onError` 接收异步 hydration、写入、rehydrate 或 clear 失败。
- migration 输入来自 storage，始终视为 `unknown`，先解析并收窄；migration 按版本同步执行。异步 migration write-back 完成后，hydration 才能提交。
- SSR 为每个请求创建独立 atom。默认 storage 不可用时显式传入 storage，或仅在客户端创建持久化 atom，避免跨请求共享状态和 hydration 不一致。

### English mirror

Use `@zhuangtai-js/core` directly outside UI/component lifecycles and choose the matching framework adapter inside components. React Native / Expo uses `@zhuangtai-js/react`.

`PersistStorage` is structural, so storage methods returning plain values or `PromiseLike` values are structurally compatible. AsyncStorage is consumer-provided to `@zhuangtai-js/persist`; there is no ZhuàngTài-specific AsyncStorage package. If first render depends on hydrated persistent state, await `persist.ready(atom)`. At a durable boundary, await `persist.flush(atom)` and handle rejection/error. Use `persist.rehydrate(atom)`, `persist.clear(atom)`, and `onError` deliberately; parse `unknown` migration input, run migrations synchronously one version at a time, and create independent atoms per SSR request.

## Agent Skills

仓库提供 `zhuangtai`、`zhuangtai-react`、`zhuangtai-plugins` 和 `zhuangtai-framework-adapters`：

```sh
npx skills add zhuangtai-js/ZhuangTai
```

## 用 AI 接入

```txt
请阅读 https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md，并按项目所用框架选择对应 adapter；如果使用异步 storage，请同时落实 persist.ready、persist.flush、onError、migration 和 SSR 边界。
```
