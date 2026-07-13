# @zhuangtai-js/react

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的 React 适配器。

`@zhuangtai-js/react` 把 `@zhuangtai-js/core` 的 atom 和 computed 桥接到 React。它基于 `useSyncExternalStore`，直接复用 core 同步的 `watch`/`get`，不引入额外的调度。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/react react
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` 是 peer dependency，支持 React 18 和 React 19。

## 使用

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  // useAtomValue 接收 ReadableAtom，所以 computed 也能直接使用。
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}

function ResetButton() {
  // useSetAtom 不订阅值，所以这个组件不会因为 count 变化而重渲染。
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

## Hooks

- `useAtomValue(atom)`：订阅一个 `ReadableAtom`（`Atom` 或 `computed`），返回当前值并在其变化时重渲染。
- `useSetAtom(atom)`：返回一个可写 `Atom` 的稳定 setter，不订阅值。只用 setter 的组件不会因值变化而重渲染。
- `useAtom(atom)`：读写一个可写 `Atom`，类似 `useState`，返回 `[value, setter]`。

## 绑定 Hook

如果不想在每个组件里传 atom，可以在创建时把 atom 绑进一个 hook。两个工厂与 core 的 `atom` / `computed` 一一对应，在创建时就区分普通 store 和计算 store。

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));

function Counter() {
  const [count, setCount] = useCount();

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useDouble();

  return <span>{double}</span>;
}
```

- `createAtomHook(atom)`：接收一个可写 `Atom`，返回的 hook 调用后得到 `[value, setter]`，像 `useState`。用于普通 store。
- `createComputedHook(atom)`：接收一个 `ReadableAtom`（通常是 `computed`），返回的 hook 调用后只得到当前值，没有 setter。用于计算 store。

两个工厂名字与 core 的 `atom` / `computed` 对称：用 `atom(...)` 创建的配 `createAtomHook`，用 `computed(...)` 创建的配 `createComputedHook`。返回的 hook 在调用点形态固定可预测，不需要靠记忆区分。

## 语义

- 值来自 core 的 `get()`，通知来自 core 的 `watch()`；都是同步的。
- core 是同步的，`get()` 始终返回最新值，因此不存在 tearing。adapter 将 `get()` 复用为 `useSyncExternalStore` 的服务端快照读取；这只提供 React 的服务端读取路径，不单独承诺特定 SSR 框架的 hydration 或请求隔离。
- `subscribe` 会跳过 core 在订阅时立即触发的那次初始 watch 回调，只在真正变化时通知 React。
- setter 与 `subscribe` 在同一个 atom 引用下保持稳定身份；React 不会在 atom 不变时重新订阅。
- setter 直接调用 `atom.set`，因此支持直接值和 updater 函数，语义与 core 一致。

## 许可证

`@zhuangtai-js/react` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/react

React adapter for ZhuàngTài atoms.

`@zhuangtai-js/react` bridges `@zhuangtai-js/core` atoms and computeds to React. It is built on `useSyncExternalStore` and reuses core's synchronous `watch`/`get` directly, without adding any scheduling.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/react react
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` is a peer dependency and supports React 18 and React 19.

## Usage

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  // useAtomValue accepts a ReadableAtom, so a computed works directly.
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}

function ResetButton() {
  // useSetAtom does not subscribe to the value, so this component does not
  // re-render when count changes.
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

## Hooks

- `useAtomValue(atom)`: subscribes to a `ReadableAtom` (an `Atom` or a `computed`), returns the current value, and re-renders when it changes.
- `useSetAtom(atom)`: returns a stable setter for a writable `Atom` without subscribing to the value. A component that uses only the setter does not re-render when the value changes.
- `useAtom(atom)`: reads and writes a writable `Atom`, like `useState`, returning `[value, setter]`.

## Bound hooks

If you would rather not pass an atom in every component, bind an atom into a hook at creation time. The two factories map one-to-one to core's `atom` / `computed`, so you distinguish writable stores from computed stores when you create the hook.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));

function Counter() {
  const [count, setCount] = useCount();

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useDouble();

  return <span>{double}</span>;
}
```

- `createAtomHook(atom)`: takes a writable `Atom` and returns a hook that yields `[value, setter]`, like `useState`. Use it for a writable store.
- `createComputedHook(atom)`: takes a `ReadableAtom` (usually a `computed`) and returns a hook that yields the current value only, with no setter. Use it for a computed store.

The factory names mirror core's `atom` / `computed`: pair `createAtomHook` with something you made via `atom(...)`, and `createComputedHook` with something you made via `computed(...)`. The shape returned at the call site is fixed and predictable, so you never have to remember which is which.

## Semantics

- Values come from core's `get()` and notifications come from core's `watch()`; both are synchronous.
- Because core is synchronous, `get()` always returns the latest value, so there is no tearing. The adapter reuses `get()` as the `useSyncExternalStore` server snapshot; this provides React's server read path but does not by itself guarantee hydration or request isolation in a specific SSR framework.
- `subscribe` skips the initial watch callback that core fires synchronously on subscribe, notifying React only on real changes.
- The setter and `subscribe` keep a stable identity for the same atom reference; React does not re-subscribe while the atom is unchanged.
- The setter calls `atom.set` directly, so it supports both concrete values and updater functions, matching core's semantics.

## License

`@zhuangtai-js/react` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
