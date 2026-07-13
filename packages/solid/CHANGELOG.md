# solid 更新日志 / Changelog

## 0.1.0 - 2026-07-13

### 新增

- 新增 `@zhuangtai-js/solid`，把 `@zhuangtai-js/core` 的 atom 和 computed 桥接为 Solid accessor。
- 新增 `createAtomValue`、`createSetAtom` 与 `createAtomSignal`。
- 客户端读取型 API 使用 Solid owner 和 `onCleanup` 自动管理 core 订阅；服务端标准 SSR 直接返回 snapshot；只写的 `createSetAtom` 可在 owner 外使用。

### 说明

- 内部 signal 从 `source.get()` 初始化并使用 `{ equals: false }`，因此相等性完全由 core 的 `Object.is` 决定。
- adapter 会抑制 core `watch` 的同步初始重复通知，同时保留读到订阅之间发生变化时的同步更新。
- Solid signal 写入使用函数包装，保留函数、对象和数组的精确身份。
- 服务端通过 `solid-js/web` 的公开 `isServer` 信号先返回 snapshot，不检查 owner、不建立 watcher；客户端组件或 `createRoot` 清理时会调用 core stopper。
- adapter 不添加 JSX、调度、批处理、延迟、事务或错误包装。
- `@zhuangtai-js/core` 与 `solid-js` 均为 peer dependency；支持 core `^0.5.0` 和 Solid `>=1.5 <2`。

### Added

- Added `@zhuangtai-js/solid`, bridging `@zhuangtai-js/core` atoms and computeds to Solid accessors.
- Added `createAtomValue`, `createSetAtom`, and `createAtomSignal`.
- Client read APIs use Solid owners and `onCleanup` to manage core subscriptions automatically. Standard server rendering returns a snapshot directly. Setter-only `createSetAtom` can run without an owner.

### Notes

- The internal signal is initialized from `source.get()` and uses `{ equals: false }`, leaving equality entirely to core's `Object.is` behavior.
- The adapter suppresses core `watch`'s synchronous duplicate initial notification while preserving synchronous updates when the value changes between reading and subscribing.
- Solid signal writes use a function wrapper, preserving the exact identity of function, object, and array values.
- The server uses the public `isServer` signal from `solid-js/web` to return a snapshot before checking for an owner and never creates a watcher. Cleaning up a client component or `createRoot` calls the core stopper.
- The adapter adds no JSX, scheduling, batching, deferring, transactions, or error wrapping.
- Both `@zhuangtai-js/core` and `solid-js` are peer dependencies; core `^0.5.0` and Solid `>=1.5 <2` are supported.
