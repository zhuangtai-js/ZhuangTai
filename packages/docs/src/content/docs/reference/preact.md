---
title: Preact 参考
description: "@zhuangtai-js/preact 的 hooks、绑定 hook、生命周期与 SSR 语义。"
---

`@zhuangtai-js/preact` 使用 Preact 原生 hooks 和 `preact/compat` 的 `useSyncExternalStore`，把 Core atom 与 computed 接入组件。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

peer 范围是 `@zhuangtai-js/core ^0.5.0` 与 Preact `>=10.9 <11`。

## 基础 hooks

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}

function ResetButton() {
  const setCount = useSetAtom(countAtom);
  return <button onClick={() => setCount(0)}>reset</button>;
}
```

- `useAtomValue(source)`：订阅可写 atom 或 computed，返回当前值。
- `useSetAtom(source)`：返回稳定 setter，不读取也不订阅值。
- `useAtom(source)`：返回 `[value, setter]`。

setter 接受具体值或 updater，并直接调用 Core `set`。

## 绑定 hooks

```tsx
import { createAtomHook, createComputedHook } from "@zhuangtai-js/preact";

const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(doubleAtom);
```

- `createAtomHook(atom)` 返回一个无参数 hook，调用后得到 `[value, setter]`。
- `createComputedHook(source)` 返回一个无参数只读 hook，调用后得到当前值。

工厂返回的 hook 身份固定。同一个 atom 引用对应的 setter 保持稳定；组件改用另一个 atom 引用时，旧订阅会被清理并连接到新 atom。

## Snapshot 与生命周期

adapter 在每个 hook 实例中缓存 snapshot。这样，即使 computed 的 `get()` 每次都创建新对象或数组，`useSyncExternalStore` 在两次 Core 通知之间也会读取同一个 snapshot 引用。

Core `watch` 在订阅时会同步发送当前值。adapter 会跳过没有变化的初始通知；如果 render 与 subscribe 之间值已经变化，则立即通知 Preact，避免漏掉更新。组件卸载或 atom 引用变化时，Preact 会调用取消订阅函数。

## 语义

- Core 的 `Object.is` 是变化判断入口：重复 `NaN` 不通知，`0` 与 `-0` 不相等。
- 对象和数组按引用判断，应使用 immutable（不可变）更新。
- adapter 不添加调度、批处理、延迟或事务。
- Core 订阅、setter 或 watcher 抛出的错误不会被替换。

## SSR

Preact 的两参数 `useSyncExternalStore` 在服务端读取同一个、不依赖浏览器 API 的 snapshot reader。服务端渲染不会调用 `watch`，因此不会创建订阅。

应用仍需为每个请求创建可变 atom，并让客户端 hydration 使用与服务端一致的初始状态。订阅为零不代表 module-level atom 可以安全地跨请求共享。

## 什么时候直接使用 Core

组件外的数据层、服务器逻辑、事件处理器或 SDK 如果不需要 Preact 重渲染，直接使用 `@zhuangtai-js/core` 的 `get`、`set` 与 `watch`。只在组件边界使用 Preact adapter。
