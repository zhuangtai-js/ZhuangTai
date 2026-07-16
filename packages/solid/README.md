# @zhuangtai-js/solid

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的 Solid 适配器。

`@zhuangtai-js/solid` 把 `@zhuangtai-js/core` 的 atom 和 computed 桥接为 Solid accessor。它直接使用 Solid 的 owner、signal 与 cleanup 原语，不需要 JSX 编译器，也不向 core 添加调度、批处理或额外相等性判断。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/solid solid-js
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

peer dependency 要求 `@zhuangtai-js/core ^0.5.0` 和 `solid-js >=1.5 <2`。

下一步：[Solid 快速指南](https://zhuangtai.yojigen.cn/guides/solid/)。

## 快速开始

```ts
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomSignal, createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = createAtomSignal(countAtom);
  const double = createAtomValue(doubleAtom);

  return {
    count,
    double,
    increment: () => setCount((value) => value + 1),
  };
}
```

客户端读取型 API 必须在 Solid owner 中调用，例如组件执行或 `createRoot`。服务端标准 `renderToString` 回调不要求 owner：adapter 只读取 snapshot，不建立 Core watcher，也不需要手工包一层 `createRoot`。

## API

### `createAtomValue(source)`

把 `ReadableAtom<Value>`（可写 atom 或 computed）转为 `Accessor<Value>`。客户端订阅 Core；服务端返回一次 snapshot。

```ts
import { createEffect, createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);

const dispose = createRoot((dispose) => {
  const count = createAtomValue(countAtom);

  createEffect(() => {
    console.log(count());
  });

  return dispose;
});

countAtom.set(1);
dispose(); // 自动停止订阅
```

客户端如果没有 Solid owner，`createAtomValue` 会在读取或调用 `source.watch` 前抛错，防止创建无法自动清理的订阅。服务端标准 SSR 不要求 owner。

### `createSetAtom(source)`

返回直接委托给 core `set` 的 setter，不读取也不订阅 atom，因此可以在 Solid owner 外使用。

```ts
import { createSetAtom } from "@zhuangtai-js/solid";

const setCount = createSetAtom(countAtom);

setCount(1);
setCount((value) => value + 1);
```

### `createAtomSignal(source)`

返回可写 atom 的 accessor 与 setter 元组：

```ts
const [count, setCount] = createAtomSignal(countAtom);
```

它等价于同时调用 `createAtomValue(source)` 和 `createSetAtom(source)`。客户端必须在 Solid owner 中调用；服务端标准 SSR 返回 snapshot accessor 与 setter，不要求手工创建 owner。

## 语义

- `createAtomValue` 先使用 `solid-js/web` 的公开 `isServer` 信号区分服务端。服务端立即读取并返回 snapshot accessor，不检查 owner，也不调用 Core `watch`；客户端才检查 owner，并且检查先于读取与订阅。
- 内部 Solid signal 使用 `{ equals: false }`。adapter 不让 Solid 再次判断相等性；是否通知完全由 core 的 `Object.is` 决定。
- core `watch` 会在订阅时同步调用一次 watcher。若该值与刚读取的初始值满足 `Object.is`，adapter 会抑制这次重复写入；若读到订阅之间发生变化，则立即同步更新 accessor。
- 后续 core 通知会同步写入 Solid signal。写入使用函数包装，因此函数值会按值保存，不会被 Solid setter 当作 updater 执行。
- 客户端组件或 `createRoot` owner 中，`onCleanup` 注册 Core 返回的 stopper；owner 被释放时，订阅随之停止。服务端 `renderToString` 不建立订阅，因此不依赖 SSR cleanup。
- 对象、数组与函数保持原始引用，不会被复制或代理。对象和数组更新仍应使用不可变更新。
- `NaN` 的重复写入不会通知；`0` 与 `-0` 会被视为不同值。这些行为来自 core 的 `Object.is`。
- adapter 不添加调度、批处理、延迟、事务或错误包装。core 的订阅错误和 watcher 错误会原样传播。

## 服务端

Solid 的标准 `renderToString(() => createAtomValue(source)...)` 路径直接读取一次 snapshot，不要求回调中存在 owner，也不建立 Core watcher；Solid 1.5 无需、也不应为兼容性手工包一层 `createRoot`。客户端组件/root owner 仍会订阅 Core，并由 `onCleanup` 自动停止；手动客户端 `createRoot` 必须调用 `dispose`。应用仍需负责按请求隔离 atom，避免跨请求共享可变状态。

## 许可证

`@zhuangtai-js/solid` 使用 [ISC License](./LICENSE)。只要副本保留版权和许可声明，即可自由使用、复制、修改和分发。

---

<a id="english"></a>

## English

`@zhuangtai-js/solid` is the Solid adapter for ZhuàngTài atoms.

It bridges atoms and computeds from `@zhuangtai-js/core` to Solid accessors. The adapter uses Solid owners, signals, and cleanup primitives directly, requires no JSX compiler, and adds no scheduling, batching, or extra equality checks to core.

## Installation

```sh
npm install @zhuangtai-js/core @zhuangtai-js/solid solid-js
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

The peer dependency range is `@zhuangtai-js/core ^0.5.0` and `solid-js >=1.5 <2`.

Next: [Solid Quick Start](https://zhuangtai.yojigen.cn/en/guides/solid/).

## Quick start

```ts
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomSignal, createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = createAtomSignal(countAtom);
  const double = createAtomValue(doubleAtom);

  return {
    count,
    double,
    increment: () => setCount((value) => value + 1),
  };
}
```

Client read APIs must run under a Solid owner, such as component execution or `createRoot`. A standard server `renderToString` callback does not require an owner: the adapter reads only a snapshot, creates no Core watcher, and needs no manual `createRoot` wrapper.

## API

### `createAtomValue(source)`

Converts a `ReadableAtom<Value>` (a writable atom or a computed) into an `Accessor<Value>`. The client subscribes to Core, while the server returns a one-time snapshot.

```ts
import { createEffect, createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);

const dispose = createRoot((dispose) => {
  const count = createAtomValue(countAtom);

  createEffect(() => {
    console.log(count());
  });

  return dispose;
});

countAtom.set(1);
dispose(); // automatically unsubscribes
```

On the client, when no Solid owner is active, `createAtomValue` throws before reading or calling `source.watch`, preventing a subscription that cannot be cleaned up automatically. Standard server rendering does not require an owner.

### `createSetAtom(source)`

Returns a setter that delegates directly to core `set`. It neither reads nor subscribes to the atom, so it can be used without a Solid owner.

```ts
import { createSetAtom } from "@zhuangtai-js/solid";

const setCount = createSetAtom(countAtom);

setCount(1);
setCount((value) => value + 1);
```

### `createAtomSignal(source)`

Returns an accessor and setter tuple for a writable atom:

```ts
const [count, setCount] = createAtomSignal(countAtom);
```

It is equivalent to calling both `createAtomValue(source)` and `createSetAtom(source)`. It requires a Solid owner on the client; standard server rendering returns a snapshot accessor and setter without requiring a manually created owner.

## Semantics

- `createAtomValue` first uses the public `isServer` signal from `solid-js/web`. The server immediately reads and returns a snapshot accessor without checking for an owner or calling Core `watch`; only the client checks for an owner, before reading or subscribing.
- The internal Solid signal uses `{ equals: false }`. The adapter does not let Solid apply a second equality check; notification remains governed entirely by core's `Object.is` behavior.
- Core `watch` invokes its watcher synchronously during subscription. When that value is `Object.is`-equal to the initial read, the adapter suppresses the duplicate write. If the value changed between reading and subscribing, the accessor is updated immediately.
- Later core notifications synchronously write to the Solid signal. Values are passed through a function wrapper so function values are stored instead of being executed as Solid setter updaters.
- In a client component or `createRoot` owner, `onCleanup` registers the Core stopper and disposal stops the subscription. Server `renderToString` creates no subscription, so it does not rely on SSR cleanup.
- Objects, arrays, and functions retain their exact references and are neither copied nor proxied. Object and array updates should remain immutable.
- Repeated `NaN` values do not notify, while `0` and `-0` are distinct. These behaviors come from core's `Object.is` equality.
- The adapter adds no scheduling, batching, deferring, transactions, or error wrapping. Core subscription errors and watcher errors propagate unchanged.

## Server rendering

The standard Solid `renderToString(() => createAtomValue(source)...)` path reads one snapshot without requiring an owner in the callback and creates no Core watcher. Solid 1.5 does not need, and should not receive, a manual `createRoot` compatibility wrapper. Client component/root owners still subscribe to Core and `onCleanup` stops them; manually created client roots must call `dispose`. Applications remain responsible for isolating atoms per request to avoid sharing mutable state across requests.

## License

`@zhuangtai-js/solid` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that copies retain the copyright and license notices.
