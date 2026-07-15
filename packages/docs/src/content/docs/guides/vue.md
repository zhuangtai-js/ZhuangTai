---
title: Vue 快速指南
description: 用 @zhuangtai-js/vue 把同步 atom 接入 Vue 的 ComputedRef、effect scope 和组件生命周期。
---

`@zhuangtai-js/vue` 适合需要在 Vue 组件中使用只读 ComputedRef、setter 和自动 scope 清理的 ZhuàngTài 状态。

## 要求与安装

- `@zhuangtai-js/core` `^0.5.0`
- Vue >=3.2 <4

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

## 最小计数器

把状态模型放在组件外，在 `setup()` 中调用 Vue adapter。updater 返回新对象和新数组，保留 Core 的引用相等性：

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

```vue title="src/components/Counter.vue"
<script setup lang="ts">
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/vue";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

const [counter, setCounter] = useAtom(counterAtom);
const double = useAtomValue(doubleAtom);
const reset = useSetAtom(counterAtom);

function increment() {
  setCounter(incrementCounter);
}
</script>

<template>
  <section>
    <button
      type="button"
      @click="increment">
      {{ counter.count }} × 2 = {{ double }}
    </button>
    <button
      type="button"
      @click="reset({ count: 0, history: [] })">
      reset ({{ counter.history.length }})
    </button>
  </section>
</template>
```

## 放置 state module

推荐把 `atom`、`computed`、类型和 updater 放在 `src/state/` 或 `src/features/<feature>/state.ts`，让 `setup()` 只连接状态和视图。客户端共享状态可以使用模块级 atom；SSR 中的用户或请求状态应由每个请求独立创建，不能复用服务器 module scope 的可变引用。

## 选择读取与写入方式

- **读写**：`useAtom(counterAtom)` 返回 `[ComputedRef<Value>, setter]`；第一个值是只读 ref。
- **只读**：`useAtomValue(doubleAtom)` 返回只读 `ComputedRef`，可在模板中直接使用。
- **只写**：`useSetAtom(counterAtom)` 只返回 setter，不读取也不订阅 atom。

读取 API 要在组件 `setup()`、`<script setup>` 或活动的 `effectScope` 中调用；setter-only API 不要求活动 scope。

## 生命周期与 SSR 边界

客户端读取 API 会把 Core watcher 注册到当前 Vue effect scope，并在 scope dispose 或组件卸载时清理。Core 仍负责立即 `set`、同步 `watch`、`Object.is` 相等性和引用式对象更新；Vue 的 DOM 提交仍由自己的 scheduler 管理。

在 `createSSRApp` 的组件 `setup()` 中，Vue SSR 路径只读取 `atom.get()` snapshot 并创建只读 `ComputedRef`，不会建立 Core 订阅。若应用在组件外手动创建 `effectScope()`，请求结束时仍必须调用 `scope.stop()`，并为每个请求创建独立状态。

## 持久化

需要跨 reload 保存状态时，参阅 [Persist 参考](/reference/persist/)，再在 state creator 中组合 `@zhuangtai-js/persist`。storage、hydration 和 request isolation 应由状态模块负责，组件只选择读写 API。

## API 参考

- [`useAtomValue`](/reference/vue/)：返回只读 `ComputedRef`。
- [`useSetAtom`](/reference/vue/)：返回不订阅值的 setter。
- [`useAtom`](/reference/vue/)：组合只读 `ComputedRef` 与 setter。

完整的 effect scope、SSR 和引用语义见 [Vue 参考](/reference/vue/)。

## 下一步

- [Core 概念](/guides/core-concepts/)：理解同步 `get`、`set`、`watch` 和 `computed`。
- [框架适配器选择](/guides/framework-adapters/)：比较各 adapter 的原生生命周期。
- [Persist 参考](/reference/persist/)：配置 storage、hydration 和 lifecycle controls。
