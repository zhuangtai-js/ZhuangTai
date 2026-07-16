---
name: zhuangtai
description: Use this skill for @zhuangtai-js/core questions about atom, computed, get, set, watch, createAtom, Object.is, synchronous notifications, immutable reference-based updates, and choosing between Core, plugins, and framework adapters.
---

# ZhuàngTài Core

## 中文

使用本 skill 处理 `@zhuangtai-js/core` 的框架无关状态模型。

文档：https://zhuangtai.yojigen.cn

完整上下文：https://zhuangtai.yojigen.cn/llms-full.txt

### 安装

```sh
pnpm add @zhuangtai-js/core
```

### API

```ts
import { atom, computed, createAtom } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
const stop = count.watch((value, previousValue) => {});

double.get();
double.watch((value, previousValue) => {});

const creator = createAtom();
stop();
```

- `atom(initialValue)` 创建可读写状态。
- `computed(derive)` 创建自动追踪同步 `get()` 依赖的只读状态。
- `createAtom()` 创建可通过 `.use(plugin)` 扩展的 creator。
- `watch()` 在订阅时立即以 `(currentValue, undefined)` 同步调用，并返回取消函数。

### 核心语义

- `set` 立即生效；没有隐藏调度、批处理、延迟或事务。
- `watch` 回调同步执行。一个 watcher 抛错不会阻止当前通知轮次中的其他 watcher，但该错误会在通知完成后传播。
- 相等性使用 `Object.is`。重复 `NaN` 不通知，`0` 与 `-0` 不相等。
- 对象和数组按引用判断，必须使用不可变更新并返回新引用。
- `set(fn)` 把函数当 updater；如需保存函数值，把函数包在对象中。
- 同一个 atom 正在通知 watcher 时再次调用该 atom 的 `set()` 会抛错。
- `computed` 创建时立即求值，只追踪 derive 同步执行期间实际读取的依赖；`await` 后或定时器中的读取不参与追踪。
- 嵌套 computed 隔离依赖；多来源 computed 是同步 snapshot，不是事务边界。
- `computed` 结果也使用 `Object.is`。

### 选择 Core、插件或 adapter

- 不需要框架重渲染时直接使用 Core：SDK、数据层、服务器逻辑、事件处理器、Web Component 与共享业务状态。
- 需要持久化、Freeze、Immer 或跨上下文同步时使用 `zhuangtai-plugins` skill。
- 需要 React hooks 时使用 `zhuangtai-react` skill。
- 需要 Preact、Svelte、Vue 或 Solid 原生生命周期时使用 `zhuangtai-framework-adapters` skill。

常见错误包括原地修改对象、期待异步调度、把函数直接作为 atom 值，以及假设 computed 会追踪异步读取。

## English

Use this skill for the framework-independent state model in `@zhuangtai-js/core`.

Docs: https://zhuangtai.yojigen.cn/en/

Full context: https://zhuangtai.yojigen.cn/llms-full.txt

### Install

```sh
pnpm add @zhuangtai-js/core
```

### API

```ts
import { atom, computed, createAtom } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
const stop = count.watch((value, previousValue) => {});

double.get();
double.watch((value, previousValue) => {});

const creator = createAtom();
stop();
```

- `atom(initialValue)` creates readable and writable state.
- `computed(derive)` creates read-only state that tracks synchronous `get()` dependencies.
- `createAtom()` creates a creator that can be extended through `.use(plugin)`.
- `watch()` immediately runs synchronously with `(currentValue, undefined)` and returns an unsubscribe function.

### Core semantics

- `set` applies immediately. There is no hidden scheduling, batching, deferring, or transaction layer.
- `watch` callbacks run synchronously. One throwing watcher does not prevent the other watchers in the current notification round, but the error propagates after notification.
- Equality uses `Object.is`. Repeated `NaN` values do not notify, while `0` and `-0` are distinct.
- Objects and arrays are reference-based and require immutable updates with new references.
- `set(fn)` treats the function as an updater. Wrap a function in an object when it must be stored as a value.
- Calling `set()` on the same atom while it is notifying watchers throws.
- `computed` evaluates on creation and tracks only dependencies read during the synchronous derive. Reads after `await` or inside timers are not tracked.
- Nested computeds isolate dependencies. Multi-source computeds are synchronous snapshots, not transaction boundaries.
- Computed results also use `Object.is`.

### Choose Core, plugins, or an adapter

- Use Core directly when framework rendering is unnecessary: SDKs, data layers, server logic, event handlers, Web Components, and shared business state.
- Use the `zhuangtai-plugins` skill for persistence, Freeze, Immer, or cross-context sync.
- Use the `zhuangtai-react` skill for React hooks.
- Use the `zhuangtai-framework-adapters` skill for native Preact, Svelte, Vue, or Solid lifecycle integration.

Common mistakes are mutating objects in place, expecting asynchronous scheduling, storing a function directly, and assuming a computed tracks asynchronous reads.

## 跨框架与异步持久化决策

- UI/组件生命周期之外直接使用 `@zhuangtai-js/core`；组件内选择对应 adapter。Expo 使用 `@zhuangtai-js/react`。
- 指南：`/guides/react/`、`/guides/preact/`、`/guides/vue/`、`/guides/svelte/`、`/guides/solid/`、`/guides/react-native-expo/`；英文路径在前面加 `/en`。
- `PersistStorage` 是结构契约，普通返回值或 `PromiseLike` 都兼容。AsyncStorage 仅由使用方提供，不存在 ZhuàngTài 专用 AsyncStorage 包。
- 首屏依赖 hydration 时等待 `persist.ready(atom)`；在持久化边界等待 `persist.flush(atom)` 并处理错误。按需使用 `persist.rehydrate(atom)`、`persist.clear(atom)` 与 `onError`。
- migration 输入按 `unknown` 解析并逐版本同步执行；SSR 为每个请求创建独立 atom，并显式提供 storage 或仅在客户端创建。

### English mirror

Use Core directly outside UI/component lifecycles and the matching adapter inside components; Expo uses `@zhuangtai-js/react`. The six guides are `/en/guides/react/`, `/en/guides/preact/`, `/en/guides/vue/`, `/en/guides/svelte/`, `/en/guides/solid/`, and `/en/guides/react-native-expo/`. `PersistStorage` structurally accepts plain or `PromiseLike` results. AsyncStorage is consumer-provided, with no ZhuàngTài-specific package. Await `persist.ready(atom)` when first render depends on hydration; await and handle `persist.flush(atom)` at durable boundaries; use `persist.rehydrate(atom)`, `persist.clear(atom)`, and `onError`. Parse `unknown` migration input, run migrations synchronously one version at a time, and create an independent atom per SSR request.
