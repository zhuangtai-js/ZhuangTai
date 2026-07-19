---
title: Svelte 快速指南
description: 用 @zhuangtai-js/svelte 把 ZhuàngTài atom 转为标准 Svelte store，并沿用 Svelte 的订阅生命周期。
---

`@zhuangtai-js/svelte` 适合希望在 Svelte 模板中使用标准 store 语法，同时保留 Core 同步更新和引用语义的场景。

## 要求与安装

- `@zhuangtai-js/core` `^0.5.0`
- Svelte >=4.2 <6

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

## 最小计数器

状态模型仍然是普通 TypeScript 模块；`toWritable` 提供读写 store，`toReadable` 提供只读 computed store。`update` 返回新对象和新数组：

```ts title="src/lib/counter.ts"
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

```svelte title="src/components/Counter.svelte"
<script lang="ts">
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";
  import { counterAtom, doubleAtom, incrementCounter } from "../lib/counter";

  const counter = toWritable(counterAtom);
  const double = toReadable(doubleAtom);

  function reset() {
    counter.set({ count: 0, history: [] });
  }
</script>

<button type="button" on:click={() => counter.update(incrementCounter)}>
  {$counter.count} × 2 = {$double}
</button>
<button type="button" on:click={reset}>
  reset ({$counter.history.length})
</button>
```

## 放置 state module

推荐把 `atom`、`computed`、类型和 updater 放在 `src/lib/` 或 `src/lib/<feature>/state.ts`，组件只把它们转换为 store。浏览器内共享状态可以使用模块级 atom；SSR 应为每个请求创建独立状态，不要共享服务器 module scope 的可变引用。

## 选择读取与写入方式

- **读写**：`toWritable(counterAtom)` 返回标准 `Writable`，可使用 `$counter`、`set` 和 `update`。
- **只读**：`toReadable(doubleAtom)` 返回标准 `Readable`，适合模板中的 `$double`。
- **只写**：Svelte adapter 没有单独的 setter-only export；只写场景可在命令模块直接调用 `counterAtom.set(nextValue)`，不建立 store 订阅。

手动订阅 `toReadable` 或 `toWritable` 时，保存 `subscribe` 返回的 stopper；模板中的 `$store` 会由 Svelte 自动订阅和清理。

## 生命周期与 SSR 边界

adapter 实现的是标准 `svelte/store` 协议，不添加新的调度、批处理或 browser API。模板 `$store` 的订阅和清理由 Svelte 负责；手动 `subscribe` 必须在生命周期结束时调用取消函数。Core 仍决定 `set` 的同步时机、`watch` 的同步回调、`Object.is` 相等性和不可变引用边界。

SSR 的边界来自底层 atom 和应用的请求生命周期：为每个请求创建独立 state/store，不把用户状态放在服务器模块级单例中。客户端 hydration 时保持与服务端输出一致的初始值。

## 持久化

需要跨 reload 保存状态时，参阅 [Persist 参考](/reference/persist/)，再在 state creator 中组合 `@zhuangtai-js/persist`。持久化控制器仍属于状态模块，Svelte 组件只消费 store。

## API 参考

- [`toReadable`](/reference/svelte/)：把 `ReadableAtom` 转为 Svelte `Readable`。
- [`toWritable`](/reference/svelte/)：把可写 `Atom` 转为 Svelte `Writable`，支持 `set` 与 `update`。

完整的 store、订阅和 SSR 语义见 [Svelte 参考](/reference/svelte/)。

## 下一步

- [Core 概念](/guides/core-concepts/)：理解同步状态原语和不可变更新。
- [框架适配器选择](/guides/framework-adapters/)：比较各框架的原生响应式 API。
- [Persist 参考](/reference/persist/)：配置 storage、hydration 和 lifecycle controls。
