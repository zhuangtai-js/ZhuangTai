# svelte 更新日志 / Changelog

## 0.1.0 - 2026-07-13

### 新增

- 新增 `@zhuangtai-js/svelte`，把 `@zhuangtai-js/core` 的 atom 和 computed 转换为符合 Svelte store contract 的 store。
- 新增 `toReadable`，将 `ReadableAtom` 转换为 Svelte `Readable`。
- 新增 `toWritable`，将可写 `Atom` 转换为 Svelte `Writable`，提供具体值 `set` 和基于最新值的 `update`。

### 说明

- 订阅完全由 core 的同步 `watch` 驱动；订阅时立即且仅立即运行一次 subscriber，后续更新会先调用可选 invalidator，再调用 subscriber。
- 取消订阅直接使用 core 返回的 stopper。
- adapter 不添加调度、批处理、runes 或额外相等性判断，因此保留 core 的同步通知、`Object.is` 相等性和错误传播语义。
- `@zhuangtai-js/core` 与 `svelte` 均为 peer dependency；支持 core `^0.5.0` 和 Svelte 4.2 及以上版本、5。

### Added

- Added `@zhuangtai-js/svelte`, converting `@zhuangtai-js/core` atoms and computeds into stores that follow the Svelte store contract.
- Added `toReadable`, which converts a `ReadableAtom` into a Svelte `Readable`.
- Added `toWritable`, which converts a writable `Atom` into a Svelte `Writable` with concrete-value `set` and latest-value `update`.

### Notes

- Subscriptions are driven entirely by core's synchronous `watch`: the subscriber runs immediately exactly once on subscription, while later updates call the optional invalidator before the subscriber.
- Unsubscription directly uses the stopper returned by core.
- The adapter adds no scheduling, batching, runes, or extra equality checks, preserving core's synchronous notifications, `Object.is` equality, and error propagation semantics.
- Both `@zhuangtai-js/core` and `svelte` are peer dependencies; core `^0.5.0` and Svelte 4.2+ and 5 are supported.
