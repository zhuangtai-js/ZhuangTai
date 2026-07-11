---
title: React 参考
description: "@zhuangtai-js/react 的 hooks 与绑定 hook 工厂。"
---

`@zhuangtai-js/react` 把 `@zhuangtai-js/core` 的 atom 和 computed 桥接到 React。它基于 `useSyncExternalStore`，直接复用 core 同步的 `watch`/`get`，不引入额外的调度。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` 是 peer dependency，支持 React 18 和 React 19。

## Hooks

三个 hook 覆盖读、写、读写。传入的 atom 由你在组件外部创建。

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
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}
```

- `useAtomValue(atom)`：订阅一个 `ReadableAtom`（`Atom` 或 `computed`），返回当前值并在其变化时重渲染。
- `useSetAtom(atom)`：返回一个可写 `Atom` 的稳定 setter，不订阅值。只用 setter 的组件不会因值变化而重渲染。
- `useAtom(atom)`：读写一个可写 `Atom`，类似 `useState`，返回 `[value, setter]`。

## 绑定 hook

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

用 `atom(...)` 创建的配 `createAtomHook`，用 `computed(...)` 创建的配 `createComputedHook`。返回的 hook 在调用点形态固定，不需要靠记忆区分。

## 语义

- 值来自 core 的 `get()`，通知来自 core 的 `watch()`；都是同步的。
- core 是同步的，`get()` 始终返回最新值，因此不存在 tearing。服务端快照复用 `get()`，支持 SSR。
- `subscribe` 会跳过 core 在订阅时立即触发的那次初始 watch 回调，只在真正变化时通知 React。
- setter 与 `subscribe` 在同一个 atom 引用下保持稳定身份；React 不会在 atom 不变时重新订阅。
- setter 直接调用 `atom.set`，因此支持直接值和 updater 函数，语义与 core 一致。
