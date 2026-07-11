---
title: 在 React 中使用
description: 把 ZhuàngTài 的 atom 接到 React 组件、hook 和 StrictMode 里。
---

`@zhuangtai-js/react` 让你可以直接在 React 里读写 ZhuàngTài 的 atom 和 computed。它不需要 provider，也不要求你把状态塞进 React context。状态还是放在 atom 里，组件只是订阅它。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` 是 peer dependency，支持 React 18 和 React 19。

## 三个基础 hook

`useAtom()` 适合读写同一个 writable atom，`useAtomValue()` 只读，`useSetAtom()` 只写。

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

function ResetButton() {
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

这个例子里，`Counter` 既读又写，`Double` 只读 `computed`，`ResetButton` 只拿 setter。组件只会因为自己订阅的 atom 变化而重渲染。

## 不用 provider，也能跨组件共享状态

状态共享的关键不在于 provider，而在于共享同一个 atom 引用。只要多个组件导入的是同一个 `countAtom`，它们看到的就是同一份状态。

```tsx
function App() {
  return (
    <>
      <Counter />
      <Double />
      <ResetButton />
    </>
  );
}
```

你可以把 atom 放在模块顶层，然后在任意组件里直接使用。这个模式很轻，不需要包一层额外的 provider 树。

## 绑定成专用 hook

如果你不想每次都把 atom 传进 hook，可以在创建时把 atom 绑定进去。

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));
```

`createAtomHook()` 返回的 hook 行为像 `useState()`，拿到的是 `[value, setter]`。`createComputedHook()` 返回的 hook 只会给你当前值，没有 setter。前者适合 writable store，后者适合 derived value。

## 重渲染是按订阅来的

这个适配器基于 `useSyncExternalStore`，它复用 core 的同步 `get()` 和 `watch()`。结果很简单，组件只有在它订阅的 atom 变化时才重渲染。

这也意味着两件事。

第一，`useSetAtom()` 不订阅值，所以只拿 setter 的组件不会因为状态变化而重渲染。第二，`computed` 也能像 atom 一样被 `useAtomValue()` 读取，React 不需要知道它背后是原始值还是派生值。

## StrictMode 也能正常工作

`@zhuangtai-js/react` 适配 React 18+，在 StrictMode 下也能正常工作。因为核心语义是同步的，React 只是在外层做订阅管理，不会改变 atom 的更新时机。

## 下一步

- 阅读 [Core 概念](/guides/core-concepts/) ，理解 `watch`、`computed` 和同步更新。
- 阅读 [React 参考](/reference/react/) ，查看 hooks 和绑定 hook 的完整说明。
