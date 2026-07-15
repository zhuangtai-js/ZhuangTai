---
title: Preact 快速指南
description: 用 @zhuangtai-js/preact 把同步 atom 接入 Preact hooks，并让组件管理订阅生命周期。
---

`@zhuangtai-js/preact` 适合需要轻量 Preact 组件订阅 ZhuàngTài atom、computed 并直接触发更新的场景。

## 要求与安装

- `@zhuangtai-js/core` `^0.5.0`
- Preact >=10.9 <11

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

## 最小计数器

把可共享的状态放在普通 TypeScript 模块，把订阅交给 Preact adapter。下面的 updater 返回新对象和新数组，不原地修改旧值：

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
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";
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

推荐把 `atom`、`computed` 和 updater 放在 `src/state/` 或 `src/features/<feature>/state.ts`，组件只导入状态并渲染。模块级 atom 适合浏览器内共享状态；服务端要为每个请求调用 state factory，不能跨请求复用可变 atom。

## 选择读取与写入方式

- **读写**：`useAtom(counterAtom)` 返回 `[value, setter]`。
- **只读**：`useAtomValue(doubleAtom)` 订阅可读 atom，包括 `computed`。
- **只写**：`useSetAtom(counterAtom)` 只返回稳定 setter，不订阅值。

`createAtomHook` 和 `createComputedHook` 可以把固定 atom 绑定成无参数 hook；它们不是另一套状态模型。

## 生命周期与 SSR 边界

adapter 使用 Preact 原生 hooks 与 `preact/compat` 的 `useSyncExternalStore`。组件卸载时，订阅会被清理；computed snapshot 会被缓存，避免每次读取新对象造成重复渲染。Core 仍保持立即 `set`、同步 `watch`、`Object.is` 相等性和不可变引用边界。

服务端使用不依赖浏览器 API 的 snapshot reader，不建立客户端订阅。应用仍负责 hydration 和请求隔离：用户或请求相关状态要在每个 SSR 请求中独立创建，并让客户端初始值与服务端输出一致。

## 持久化

需要跨 reload 保存状态时，参阅 [Persist 参考](/reference/persist/)，再在 state creator 中组合 `@zhuangtai-js/persist`。adapter 只负责 Preact 订阅，storage 与 hydration 应留在状态模块。

## API 参考

- [`useAtomValue`](/reference/preact/)：只读订阅 `Atom` 或 `computed`。
- [`useSetAtom`](/reference/preact/)：返回不订阅值的 setter。
- [`useAtom`](/reference/preact/)：组合读写。
- `createAtomHook`、`createComputedHook`：绑定固定 atom 的无参数 hook 工厂。

完整签名、snapshot 和 SSR 语义见 [Preact 参考](/reference/preact/)。

## 下一步

- [Core 概念](/guides/core-concepts/)：理解同步状态原语。
- [框架适配器选择](/guides/framework-adapters/)：比较各框架的读写与生命周期 API。
- [Persist 参考](/reference/persist/)：配置 storage、hydration 和 lifecycle controls。
