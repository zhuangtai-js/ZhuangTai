# react 更新日志 / Changelog

## 0.1.2 - 2026-07-11

### 变更

- 将 `@zhuangtai-js/core` peer dependency 收紧为 `^0.4.0`。
- 将 React peer dependency 明确限定为 `>=18 <20`，覆盖已经支持和验证的 React 18、19，而不再默许未知的未来主版本。

### 说明

- 本次更新只修正安装兼容声明，不改变 hooks、snapshot 或订阅语义。

### Changed

- Narrowed the `@zhuangtai-js/core` peer dependency to `^0.4.0`.
- Bounded the React peer dependency to `>=18 <20`, covering the supported and verified React 18 and 19 lines without claiming compatibility with unknown future majors.

### Notes

- This update only corrects installation compatibility metadata. It does not change hook, snapshot, or subscription semantics.

## 0.1.1 - 2026-07-11

### 修复

- `useAtomValue` 现在会在 store 通知之间缓存 React snapshot。即使 computed 的 `get()` 每次都返回新的对象或数组引用，也不会再触发 `useSyncExternalStore` 的无限更新。
- 订阅时仍会同步读取 core watcher 提供的最新值，以覆盖 render 与 subscribe 之间发生的更新；真正的后续变化仍立即通知 React。

### 说明

- 本次修复只稳定 React adapter 的 snapshot 身份，不改变 core 的同步通知、`Object.is` 相等性或 computed 求值语义。

### Fixed

- `useAtomValue` now caches the React snapshot between store notifications. A computed whose `get()` returns a fresh object or array reference on every call no longer causes an infinite `useSyncExternalStore` update loop.
- Subscription still synchronizes from the latest value supplied by core's watcher, covering changes between render and subscribe; subsequent real changes continue to notify React immediately.

### Notes

- This fix only stabilizes snapshot identity in the React adapter. It does not change core's synchronous notifications, `Object.is` equality, or computed evaluation semantics.

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
