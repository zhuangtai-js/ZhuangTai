# preact 更新日志 / Changelog

## 0.1.0 - 2026-07-13

### 新增

- 新增 `@zhuangtai-js/preact`，把 `@zhuangtai-js/core` 的 atom 和 computed 桥接到 Preact，且不依赖 React。
- 新增 `useAtomValue`、`useSetAtom`、`useAtom`、`createAtomHook` 和 `createComputedHook`。
- 使用 Preact hooks 和 `preact/compat` 的双参数 `useSyncExternalStore`，支持稳定 setter、atom 替换清理与服务端 snapshot 读取。

### 语义

- 缓存 core snapshot，支持每次读取都返回新对象或数组的 computed。
- 抑制 core 订阅时没有变化的立即 watch 回调，同时检测并补上 render 到 subscribe 之间的更新。
- 保持 core 的同步通知和 `Object.is` 相等性，不增加 batching、延迟或隐藏调度。

### Added

- Added `@zhuangtai-js/preact`, bridging `@zhuangtai-js/core` atoms and computeds to Preact without depending on React.
- Added `useAtomValue`, `useSetAtom`, `useAtom`, `createAtomHook`, and `createComputedHook`.
- Uses Preact hooks and the two-argument `useSyncExternalStore` from `preact/compat`, with stable setters, cleanup on atom replacement, and server snapshot reads.

### Semantics

- Caches core snapshots to support computeds that return a fresh object or array on every read.
- Suppresses core's unchanged immediate watch callback while detecting and closing updates between render and subscribe.
- Preserves core's synchronous notifications and `Object.is` equality without batching, deferring, or hidden scheduling.
