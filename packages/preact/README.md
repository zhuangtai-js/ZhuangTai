# @zhuangtai-js/preact

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的 Preact 适配器。

`@zhuangtai-js/preact` 把 `@zhuangtai-js/core` 的 atom 和 computed 桥接到 Preact。它使用 Preact hooks 和 `preact/compat` 的双参数 `useSyncExternalStore`，直接复用 core 同步的 `watch` / `get`，不引入 React，也不增加额外调度。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/preact preact
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

peer dependency 要求 `@zhuangtai-js/core ^0.5.0` 和 `preact >=10.9 <11`。

下一步：[Preact 快速指南](https://zhuangtai.yojigen.cn/guides/preact/)。

## 使用

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}

function ResetButton() {
  // 不订阅值，因此 count 变化不会让这个组件重渲染。
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

## API

- `useAtomValue(atom)`：订阅 `ReadableAtom`（可写 atom 或 computed），返回当前值并在变化时重渲染。
- `useSetAtom(atom)`：返回可写 atom 的稳定 setter，不订阅当前值。
- `useAtom(atom)`：像 `useState` 一样返回 `[value, setter]`。
- `createAtomHook(atom)`：创建绑定到可写 atom 的无参数 hook，返回 `[value, setter]`。
- `createComputedHook(atom)`：创建绑定到 `ReadableAtom` 的无参数只读 hook，返回当前值。

## 绑定 Hook

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));

function Counter() {
  const [count, setCount] = useCount();
  const double = useDouble();

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}
```

工厂返回的 hook 身份固定；`useSetAtom` 返回的 setter 在 atom 引用不变时也保持稳定。组件替换为另一个 atom 引用时，旧订阅会被清理并连接到新 atom。

## 语义与 SSR

- 值来自 core 的 `get()`，通知来自 core 的同步 `watch()`；setter 直接调用 `atom.set()`。
- adapter 会缓存 snapshot，避免每次读取都创建新对象或数组的 computed 触发更新循环。
- core 在订阅时会立即调用 watcher。adapter 会抑制没有变化的初始回调；如果 render 与 subscribe 之间发生了更新，则立即通知 Preact，避免漏掉该值。
- 相等性由 core 的 `Object.is` 语义决定，包括 `NaN` 相等以及 `0` / `-0` 不相等。
- Preact 的 `useSyncExternalStore` 接受两个参数。adapter 提供不依赖浏览器 API 的 `getSnapshot`，因此服务端渲染可以读取当前值且不会建立订阅。请求隔离和 hydration 状态一致性仍由应用或 SSR 框架负责。

## 许可证

`@zhuangtai-js/preact` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/preact

Preact adapter for ZhuàngTài atoms.

`@zhuangtai-js/preact` bridges `@zhuangtai-js/core` atoms and computeds to Preact. It uses Preact hooks and the two-argument `useSyncExternalStore` from `preact/compat`, directly reusing core's synchronous `watch` / `get` without React or additional scheduling.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/preact preact
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

The peer dependency range is `@zhuangtai-js/core ^0.5.0` and `preact >=10.9 <11`.

Next: [Preact Quick Start](https://zhuangtai.yojigen.cn/en/guides/preact/).

## Usage

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}

function ResetButton() {
  // This component does not subscribe, so count changes do not re-render it.
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

## API

- `useAtomValue(atom)`: subscribes to a `ReadableAtom` (a writable atom or computed), returns its current value, and re-renders on changes.
- `useSetAtom(atom)`: returns a stable setter for a writable atom without subscribing to its current value.
- `useAtom(atom)`: returns `[value, setter]`, like `useState`.
- `createAtomHook(atom)`: creates an argument-free hook bound to a writable atom and returning `[value, setter]`.
- `createComputedHook(atom)`: creates an argument-free read-only hook bound to a `ReadableAtom` and returning its current value.

## Bound hooks

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));

function Counter() {
  const [count, setCount] = useCount();
  const double = useDouble();

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}
```

A factory returns a stable hook, and the setter returned by `useSetAtom` stays stable while the atom reference is unchanged. Replacing the atom reference cleans up the old subscription and connects to the new atom.

## Semantics and SSR

- Values come from core's `get()`, notifications come from core's synchronous `watch()`, and setters call `atom.set()` directly.
- The adapter caches snapshots so computeds that create a fresh object or array on every read do not cause update loops.
- Core calls a watcher immediately during subscription. The adapter suppresses that initial callback when nothing changed; if an update occurred between render and subscribe, it notifies Preact immediately so the value is not missed.
- Equality follows core's `Object.is` semantics, including equal `NaN` values and distinct `0` / `-0` values.
- Preact's `useSyncExternalStore` accepts two arguments. The adapter supplies a browser-independent `getSnapshot`, so server rendering can read the current value without creating a subscription. Request isolation and hydration-state consistency remain the responsibility of the application or SSR framework.

## License

`@zhuangtai-js/preact` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
