---
title: Solid 快速指南
description: 用 @zhuangtai-js/solid 把同步 atom 接入 Solid accessor 和 owner 生命周期。
---

`@zhuangtai-js/solid` 适合需要在 Solid 组件或 root 中读取、写入并自动绑定 Core 订阅清理的场景。

## 要求与安装

- `@zhuangtai-js/core` `^0.5.0`
- Solid >=1.5 <2

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

## 最小计数器

把状态模型放在组件外，在 Solid owner 中调用 adapter。updater 返回新对象和新数组，不原地修改 atom 的值：

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
import { createAtomSignal, createAtomValue, createSetAtom } from "@zhuangtai-js/solid";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

export function Counter() {
  const [counter, setCounter] = createAtomSignal(counterAtom);
  const double = createAtomValue(doubleAtom);
  const reset = createSetAtom(counterAtom);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCounter(incrementCounter)}>
        {counter().count} × 2 = {double()}
      </button>
      <button
        type="button"
        onClick={() => reset({ count: 0, history: [] })}>
        reset ({counter().history.length})
      </button>
    </section>
  );
}
```

## 放置 state module

推荐把 `atom`、`computed`、类型和 updater 放在 `src/state/` 或 `src/features/<feature>/state.ts`，组件只在 owner 内连接 accessor。客户端模块级 atom 可用于共享状态；SSR 的用户或请求状态必须由每个请求独立创建。

## 选择读取与写入方式

- **读写**：`createAtomSignal(counterAtom)` 返回 `[Accessor<Value>, setter]`。
- **只读**：`createAtomValue(doubleAtom)` 返回 `Accessor<Value>`，在 JSX 中通过 `double()` 读取。
- **只写**：`createSetAtom(counterAtom)` 只返回 setter，不读取也不订阅，可以在 owner 外调用。

客户端 read API 必须运行在 Solid component 或 `createRoot` owner 中；setter-only API 不要求 owner。

## 生命周期与 SSR 边界

客户端的 `createAtomValue` 会把 Core watcher 绑定到当前 owner，并通过 `onCleanup` 停止订阅；手动创建 `createRoot` 时，要保存并调用它返回的 `dispose`。Core 仍负责立即 `set`、同步 `watch`、`Object.is` 相等性和不可变引用边界。

标准服务端 `renderToString` 路径通过 `solid-js/web` 的 `isServer` 读取一次 snapshot，不检查 owner，也不创建 Core 订阅。SSR 仍要为每个请求创建独立 atom；不要共享服务器 module scope 的可变状态。

## 持久化

需要跨 reload 保存状态时，参阅 [Persist 参考](/reference/persist/)，再在 state creator 中组合 `@zhuangtai-js/persist`。持久化控制器属于状态模块，Solid 组件只负责选择 accessor 和 setter API。

## API 参考

- [`createAtomValue`](/reference/solid/)：把 `ReadableAtom` 转为 accessor。
- [`createSetAtom`](/reference/solid/)：返回不订阅值的 setter。
- [`createAtomSignal`](/reference/solid/)：组合 accessor 与 setter。

完整的 owner、cleanup、SSR 和引用语义见 [Solid 参考](/reference/solid/)。

## 下一步

- [Core 概念](/guides/core-concepts/)：理解同步 `get`、`set`、`watch` 和 `computed`。
- [框架适配器选择](/guides/framework-adapters/)：比较各 adapter 的 owner/lifecycle 边界。
- [Persist 参考](/reference/persist/)：配置 storage、hydration 和 lifecycle controls。
