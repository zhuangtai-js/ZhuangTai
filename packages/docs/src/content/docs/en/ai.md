---
title: AI Friendly
description: A ZhuàngTài entry point that is easier for people and models to read, search, and plug into.
---

ZhuàngTài collects the package-selection, framework, and asynchronous-persistence rules an AI agent needs on this page. The Chinese page is primary; this English page mirrors its public semantics.

## llms outputs

- `https://zhuangtai.yojigen.cn/llms.txt`: site index and critical constraints.
- `https://zhuangtai.yojigen.cn/llms-small.txt`: smaller context.
- `https://zhuangtai.yojigen.cn/llms-full.txt`: complete documentation context.

## Framework selection

Use `@zhuangtai-js/core` directly outside UI/component lifecycles. Inside components, choose the matching framework adapter. React Native / Expo uses `@zhuangtai-js/react`; it does not need a native-specific adapter.

- [React](/en/guides/react/) / [中文](/guides/react/)
- [Preact](/en/guides/preact/) / [中文](/guides/preact/)
- [Vue](/en/guides/vue/) / [中文](/guides/vue/)
- [Svelte](/en/guides/svelte/) / [中文](/guides/svelte/)
- [Solid](/en/guides/solid/) / [中文](/guides/solid/)
- [React Native / Expo](/en/guides/react-native-expo/) / [中文](/guides/react-native-expo/)

Core `set` applies immediately, `watch` runs synchronously, and equality uses `Object.is`. Object and array updates must be immutable. Adapters add no hidden scheduling, batching, or transactions.

## Async Persist decisions

- `PersistStorage` is a structural contract. `getItem`, `setItem`, and `removeItem` methods returning plain values or `PromiseLike` values are structurally compatible.
- AsyncStorage is consumer-provided to `@zhuangtai-js/persist`; there is no ZhuàngTài-specific AsyncStorage package.
- If first render depends on hydrated persistent state, `await persist.ready(atom)` before showing UI that depends on it.
- At exit, submit, or another durable boundary, `await persist.flush(atom)` and handle rejection/error. A synchronous `set` does not mean an asynchronous durable write has finished.
- `persist.rehydrate(atom)` reads storage again, and `persist.clear(atom)` removes the persisted value. Use `onError` for asynchronous hydration, write, rehydrate, or clear failures.
- Migration input comes from storage and remains `unknown`; parse and narrow it first. Migrations run synchronously one version at a time, and async migration write-back finishes before hydration commits.
- For SSR, create an independent atom per request. Pass explicit storage when the default is unavailable, or create the persisted atom only on the client, avoiding cross-request state and hydration mismatches.

### 中文镜像

在 UI 或组件生命周期之外直接使用 `@zhuangtai-js/core`，在组件内选择对应的 framework adapter；React Native / Expo 使用 `@zhuangtai-js/react`。

`PersistStorage` 是结构契约，storage 方法返回普通值或 `PromiseLike` 都结构兼容。AsyncStorage 只由使用方传给 `@zhuangtai-js/persist`，不存在 ZhuàngTài 专用 AsyncStorage 包。首屏依赖 hydration 状态时等待 `persist.ready(atom)`；在持久化边界等待 `persist.flush(atom)` 并处理错误。明确使用 `persist.rehydrate(atom)`、`persist.clear(atom)` 和 `onError`；解析 `unknown` migration 输入，逐版本同步迁移，并为每个 SSR 请求创建独立 atom。

## Agent Skills

The repository provides `zhuangtai`, `zhuangtai-react`, `zhuangtai-plugins`, and `zhuangtai-framework-adapters`:

```sh
npx skills add zhuangtai-js/ZhuangTai
```

## Set up with AI

```txt
Read https://raw.githubusercontent.com/zhuangtai-js/ZhuangTai/main/docs/guide/installation.md, choose the adapter matching this project's framework, and apply the persist.ready, persist.flush, onError, migration, and SSR boundaries when storage is asynchronous.
```
