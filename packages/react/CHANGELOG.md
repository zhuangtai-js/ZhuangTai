# react 更新日志 / Changelog

## 0.1.0 - 2026-07-07

### 新增

- 新增 `@zhuangtai-js/react`，把 `@zhuangtai-js/core` 的 atom 和 computed 桥接到 React。
- 新增 `useAtomValue`、`useSetAtom`、`useAtom` 三个 hook，基于 `useSyncExternalStore` 实现。
- 新增 `createAtomHook` 和 `createComputedHook` 两个工厂，用于创建类 zustand 的绑定 hook；命名与 core 的 `atom` / `computed` 对称，在创建时即区分普通 store 和计算 store。

### 说明

- `react` 是 peer dependency，需要 React 18 或更高版本。
- core 是同步的，`get()` 始终返回最新值，因此不存在 tearing；服务端快照复用 `get()`，支持 SSR。
- `subscribe` 会跳过 core 在订阅时立即触发的初始 watch 回调，只在真正变化时通知 React。

### Added

- Added `@zhuangtai-js/react`, bridging `@zhuangtai-js/core` atoms and computeds to React.
- Added the `useAtomValue`, `useSetAtom`, and `useAtom` hooks, built on `useSyncExternalStore`.
- Added the `createAtomHook` and `createComputedHook` factories for zustand-style bound hooks; their names mirror core's `atom` / `computed`, so writable stores and computed stores are distinguished at creation time.

### Notes

- `react` is a peer dependency and requires React 18 or later.
- Because core is synchronous, `get()` always returns the latest value, so there is no tearing; the server snapshot reuses `get()`, which supports SSR.
- `subscribe` skips the initial watch callback that core fires synchronously on subscribe, notifying React only on real changes.
