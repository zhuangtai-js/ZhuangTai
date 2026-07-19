---
title: React 快速指南
description: 用 @zhuangtai-js/react 在 React 组件中读写同步 atom，并保持清晰的订阅边界。
---

`@zhuangtai-js/react` 适合需要在 React 组件中直接读取、写入并自动清理 ZhuàngTài atom 订阅的场景。

## 要求与安装

- `@zhuangtai-js/core` `^0.5.0`
- React >=18 <20

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

## 最小计数器

先把状态和派生值放在普通 TypeScript 模块，再在组件边界使用 React adapter。这个例子用对象展开和新数组完成不可变更新：

```ts title="src/state/counter.ts"
import { atom, computed } from "@zhuangtai-js/core";

export type CounterState = {
  count: number;
  history: number[];
};

export const counterAtom = atom<CounterState>({ count: 0, history: [] });
export const doubleAtom = computed(() => counterAtom.get().count * 2);

export function incrementCounter(state: CounterState): CounterState {
  const count = state.count + 1;
  return { ...state, count, history: [...state.history, count] };
}
```

```tsx title="src/components/Counter.tsx"
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

export function Counter() {
  const [counter, setCounter] = useAtom(counterAtom);
  const double = useAtomValue(doubleAtom);
  const reset = useSetAtom(counterAtom);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCounter(incrementCounter)}>
        {counter.count} × 2 = {double}
      </button>
      <button
        type="button"
        onClick={() => reset({ count: 0, history: [] })}>
        reset ({counter.history.length})
      </button>
    </section>
  );
}
```

## 放置 state module

推荐把 `atom`、`computed` 和类型化 updater 放在 `src/state/` 或 `src/features/<feature>/state.ts`，让组件只负责渲染和事件。客户端共享状态可以使用模块级 atom；服务端请求状态应改为每个请求调用一次的 state factory，避免跨请求共享可变引用。

## 选择读取与写入方式

- **读写**：`useAtom(counterAtom)` 返回 `[value, setter]`，适合上面的计数器。
- **只读**：`useAtomValue(doubleAtom)` 订阅 `Atom` 或 `computed`，适合展示派生值。
- **只写**：`useSetAtom(counterAtom)` 只返回稳定 setter，不订阅值，适合 reset 或命令按钮。

不需要 Provider；多个组件导入同一个 atom 引用即可共享状态。

## 生命周期与 SSR 边界

adapter 通过 React 的 `useSyncExternalStore` 对接 Core 的同步 `get()` / `watch()`，组件卸载时会取消订阅。Core 仍然负责立即 `set`、同步 watcher 和 `Object.is` 相等性；React 可能延后 DOM 提交，但 adapter 不会添加批处理或隐藏调度。

SSR 使用 `get()` 作为 server snapshot，但 hydration、请求隔离和服务端 state factory 仍由应用负责。不要在服务器 module scope 中放用户或请求相关的可变 atom；每个 SSR 请求创建独立状态，并让服务端与客户端初始值一致。

## 持久化

需要跨 reload 保存状态时，参阅 [Persist 参考](/reference/persist/)，再把 `@zhuangtai-js/persist` 组合到 state creator。持久化不改变组件 adapter 的读写选择，storage 与 hydration 仍应放在 state module 的边界内。

## API 参考

- [`useAtomValue`](/reference/react/)：只读订阅 `Atom` 或 `computed`。
- [`useSetAtom`](/reference/react/)：返回不订阅值的 setter。
- [`useAtom`](/reference/react/)：组合读写。
- `createAtomHook` 与 `createComputedHook`：需要无参数专用 hook 时使用。

完整签名和订阅语义见 [React 参考](/reference/react/)。

## 下一步

- [Core 概念](/guides/core-concepts/)：理解 `get`、`set`、`watch` 和 `computed`。
- [框架适配器选择](/guides/framework-adapters/)：比较 React、Preact、Vue、Svelte 和 Solid。
- [Persist 参考](/reference/persist/)：配置 storage、hydration 和 lifecycle controls。
