# vue 更新日志 / Changelog

## 0.1.0 - 2026-07-13

### 新增

- 新增 `@zhuangtai-js/vue`，把 `@zhuangtai-js/core` 的 atom 和 computed 桥接为 Vue 3 的只读 `ComputedRef`。
- 新增 `useAtomValue`、`useSetAtom` 与 `useAtom`。
- `useAtomValue` 使用保留对象身份的浅层快照，避免为 core 值创建深层 Vue 代理，并在客户端通过当前 effect scope 自动清理订阅；Vue SSR 组件 setup 使用不创建订阅的只读路径。

### 说明

- 客户端读取型 API 必须在活动的 Vue effect scope 中调用；缺少 scope 时会在调用 `atom.watch` 前抛错。Vue SSR 组件 setup 只读取 `atom.get()`，不创建 core 订阅，因为 `renderToString` 不会停止组件 effect scope。只写的 `useSetAtom` 可在 scope 外使用。
- core 的同步 `watch` 通知会同步更新返回的 computed ref；adapter 不添加调度、批处理、延迟或可写 ref。
- 相等性仍由 core 的 `Object.is` 决定，对象和数组仍按引用更新；core 与 watcher 错误不会被 adapter 捕获或替换。
- `@zhuangtai-js/core` 与 `vue` 均为 peer dependency；支持 core `^0.5.0` 和 Vue `>=3.2 <4`。

### Added

- Added `@zhuangtai-js/vue`, bridging `@zhuangtai-js/core` atoms and computeds to read-only Vue 3 `ComputedRef` values.
- Added `useAtomValue`, `useSetAtom`, and `useAtom`.
- `useAtomValue` uses an identity-preserving shallow snapshot, avoids creating deep Vue proxies for core values, and cleans up its client-side subscription with the current effect scope; Vue SSR component setup uses a read-only path that creates no subscription.

### Notes

- Client-side read APIs must be called inside an active Vue effect scope; when no scope exists, they throw before calling `atom.watch`. Vue SSR component setup only reads `atom.get()` and creates no core subscription because `renderToString` does not stop the component effect scope. Setter-only `useSetAtom` can be used outside a scope.
- Core's synchronous `watch` notifications update the returned computed ref synchronously. The adapter adds no scheduling, batching, deferring, or writable ref.
- Equality remains governed by core's `Object.is`; objects and arrays remain reference-based. Errors from core and watchers are neither caught nor replaced by the adapter.
- Both `@zhuangtai-js/core` and `vue` are peer dependencies; core `^0.5.0` and Vue `>=3.2 <4` are supported.
