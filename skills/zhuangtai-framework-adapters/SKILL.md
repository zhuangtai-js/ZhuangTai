---
name: zhuangtai-framework-adapters
description: Use this skill for exact installation, APIs, lifecycle, SSR, request isolation, Object.is semantics, and immutable updates with @zhuangtai-js/preact, @zhuangtai-js/svelte, @zhuangtai-js/vue, and @zhuangtai-js/solid.
---

# ZhuàngTài Framework Adapters

## 中文

本 skill 覆盖 Preact、Svelte、Vue 与 Solid adapter。React 使用独立的 `zhuangtai-react` skill。

### 安装与 peer 范围

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

- `@zhuangtai-js/preact`：Core `^0.5.0`，Preact `>=10.9 <11`。
- `@zhuangtai-js/svelte`：Core `^0.5.0`，Svelte `>=4.2 <6`。
- `@zhuangtai-js/vue`：Core `^0.5.0`，Vue `>=3.2 <4`。
- `@zhuangtai-js/solid`：Core `^0.5.0`，Solid `>=1.5 <2`。

不要扩展到这些 peer 范围之外。

### 精确 API

**Preact**

- `useAtomValue(source)`：订阅 atom/computed 并返回值。
- `useSetAtom(atom)`：稳定 setter，不订阅。
- `useAtom(atom)`：`[value, setter]`。
- `createAtomHook(atom)`：绑定可写 atom 的无参数 hook。
- `createComputedHook(source)`：绑定只读 source 的无参数 hook。

**Svelte**

- `toReadable(source)`：返回标准 `Readable<Value>`。
- `toWritable(atom)`：返回标准 `Writable<Value>`，提供 `subscribe`、`set`、`update`。

**Vue**

- `useAtomValue(source)`：返回只读 `ComputedRef<Value>`，要求活动 effect scope。
- `useSetAtom(atom)`：返回 setter，不要求 scope。
- `useAtom(atom)`：返回 `[ComputedRef<Value>, setter]`，要求活动 scope。

**Solid**

- `createAtomValue(source)`：返回 `Accessor<Value>`；客户端要求 owner，服务端标准 SSR 返回 snapshot 且不要求 owner。
- `createSetAtom(atom)`：返回 setter，不要求 owner。
- `createAtomSignal(atom)`：返回 `[Accessor<Value>, setter]`；客户端要求 owner，服务端标准 SSR 不要求 owner。

### 生命周期与 SSR

- Preact 使用 `preact/compat` 的两参数 `useSyncExternalStore`。服务端读取 snapshot 而不调用 `watch`；组件卸载或 atom 引用变化时 Preact 清理订阅。
- Svelte 返回标准 store。`$store` 自动清理；手动 `subscribe` 必须调用 stopper。adapter 不使用 runes。
- Vue 读取 API 必须在 `setup()`、`<script setup>` 或活动 `effectScope` 中。`createSSRApp` 的 `renderToString` 路径只读取 snapshot，不安装 Core watcher，也不依赖 SSR 后的组件 scope cleanup；客户端活动 scope 才订阅 Core，并由 `onScopeDispose` 释放，手动 scope 仍需 `scope.stop()`。
- Solid 服务端先使用 `solid-js/web` 的公开 `isServer` 信号，标准 `renderToString` 回调直接读取 snapshot，不检查 owner、不安装 Core watcher，也不需要为 Solid 1.5 手工包 `createRoot`。客户端读取 API 必须在组件或 `createRoot` owner 中；客户端 owner 检查先于读取与订阅，Core 订阅由 `onCleanup` 释放，手动客户端 root 必须 `dispose()`。
- 所有 SSR 可变 atom 都要按请求创建。cleanup 不等于隔离，不能跨用户共享服务器 module-level atom。
- hydration 初始值必须与服务端输出一致。Persist 默认 `localStorage`，服务端需显式同步 storage 或仅在客户端创建。

### Core 语义不变

- `set` 立即生效，`watch` 同步执行。
- 相等性由 Core `Object.is` 决定；adapter 不增加深比较。
- 对象和数组按引用判断，必须 immutable 更新。
- adapter 不添加调度、批处理、延迟或事务。
- 只写组件使用 setter-only API，避免无意义订阅。

### 直接使用 Core 的时机

SDK、服务器逻辑、数据层、事件处理器、Web Component 或跨框架共享状态如果不需要框架重渲染，直接使用 `@zhuangtai-js/core`。只在 UI 边界包装 adapter。

## English

Use this skill for the Preact, Svelte, Vue, and Solid adapters. React has the separate `zhuangtai-react` skill.

### Install and peer ranges

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

- `@zhuangtai-js/preact`: Core `^0.5.0`, Preact `>=10.9 <11`.
- `@zhuangtai-js/svelte`: Core `^0.5.0`, Svelte `>=4.2 <6`.
- `@zhuangtai-js/vue`: Core `^0.5.0`, Vue `>=3.2 <4`.
- `@zhuangtai-js/solid`: Core `^0.5.0`, Solid `>=1.5 <2`.

Do not claim support outside these peer ranges.

### Exact APIs

**Preact**

- `useAtomValue(source)` subscribes to an atom/computed and returns its value.
- `useSetAtom(atom)` returns a stable setter without subscribing.
- `useAtom(atom)` returns `[value, setter]`.
- `createAtomHook(atom)` binds a writable atom into an argument-free hook.
- `createComputedHook(source)` binds a readable source into an argument-free hook.

**Svelte**

- `toReadable(source)` returns a standard `Readable<Value>`.
- `toWritable(atom)` returns a standard `Writable<Value>` with `subscribe`, `set`, and `update`.

**Vue**

- `useAtomValue(source)` returns a read-only `ComputedRef<Value>` and requires an active effect scope.
- `useSetAtom(atom)` returns a setter and does not require a scope.
- `useAtom(atom)` returns `[ComputedRef<Value>, setter]` and requires an active scope.

**Solid**

- `createAtomValue(source)` returns an `Accessor<Value>`; it requires an owner on the client, while standard server rendering returns a snapshot without one.
- `createSetAtom(atom)` returns a setter and does not require an owner.
- `createAtomSignal(atom)` returns `[Accessor<Value>, setter]`; it requires an owner on the client but not during standard server rendering.

### Lifecycle and SSR

- Preact uses the two-argument `useSyncExternalStore` from `preact/compat`. Server rendering reads a snapshot without calling `watch`. Preact cleans up when the component unmounts or the atom reference changes.
- Svelte returns standard stores. `$store` owns cleanup; a manual `subscribe` must call its stopper. The adapter does not use runes.
- Vue read APIs require `setup()`, `<script setup>`, or an active `effectScope`. The `createSSRApp` `renderToString` path reads only a snapshot, installs no Core watcher, and does not rely on component-scope cleanup after SSR; only active client scopes subscribe to Core and `onScopeDispose` releases them. A manually created scope still needs `scope.stop()`.
- Solid first uses the public `isServer` signal from `solid-js/web` on the server. A standard `renderToString` callback reads a snapshot without checking for an owner or installing a Core watcher, and Solid 1.5 needs no manual `createRoot` wrapper. Client read APIs require a component or `createRoot` owner; the client owner check happens before reading or subscribing, `onCleanup` releases the Core subscription, and manually created client roots must call `dispose()`.
- Create mutable SSR atoms per request. Cleanup is not isolation; never share user-specific mutable atoms from server module scope.
- Hydration initial state must match server output. Persist defaults to `localStorage`, so server code needs explicit synchronous storage or client-only creation.

### Core semantics stay unchanged

- `set` applies immediately and `watch` runs synchronously.
- Core `Object.is` is the equality gate; adapters add no deep comparison.
- Objects and arrays are reference-based and require immutable updates.
- Adapters add no scheduling, batching, deferring, or transactions.
- Use setter-only APIs for write-only components to avoid unnecessary subscriptions.

### When to use Core directly

Use `@zhuangtai-js/core` directly in SDKs, server logic, data layers, event handlers, Web Components, or cross-framework shared state that does not need framework rendering. Wrap an adapter only at the UI boundary.
