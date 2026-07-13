---
title: 框架适配器最佳实践
description: 在 Preact、Svelte、Vue 与 Solid 中使用原生 API，并正确处理生命周期、SSR 与请求隔离。
---

ZhuàngTài 的 adapter 只负责把 Core 的 `get`、`set`、`watch` 接到框架原生响应式接口。Core 仍然决定状态何时改变：`set` 立即生效，`watch` 同步执行，相等性使用 `Object.is`，对象和数组需要 `immutable`（不可变）更新。

## 选择包与 API

所有 adapter 都要求 `@zhuangtai-js/core ^0.5.0`，并只声明下面的框架 peer 范围。

| 框架   | 安装                   | peer 范围           | 原生 API                                                                          |
| ------ | ---------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Preact | `@zhuangtai-js/preact` | Preact `>=10.9 <11` | `useAtomValue`、`useSetAtom`、`useAtom`、`createAtomHook`、`createComputedHook`   |
| Svelte | `@zhuangtai-js/svelte` | Svelte `>=4.2 <6`   | `toReadable`、`toWritable`，返回 `svelte/store`                                   |
| Vue    | `@zhuangtai-js/vue`    | Vue `>=3.2 <4`      | `useAtomValue`、`useSetAtom`、`useAtom`，返回 `ComputedRef` 与 setter             |
| Solid  | `@zhuangtai-js/solid`  | Solid `>=1.5 <2`    | `createAtomValue`、`createSetAtom`、`createAtomSignal`，返回 `Accessor` 与 setter |

如果状态只在框架生命周期之外使用，直接安装并使用 `@zhuangtai-js/core` 即可。

## 共同原则

### 让框架拥有订阅生命周期

- 组件只读时使用只读 API；只写时使用 setter-only API，避免不必要的订阅。
- 让 Preact hook、Svelte `$store`、Vue effect scope 或 Solid 客户端 owner 管理订阅清理。
- 手动调用 Svelte `subscribe` 时保存并调用返回的取消函数。
- 手动创建 Vue `effectScope()` 或 Solid `createRoot()` 时，在生命周期结束时分别调用 `scope.stop()` 或 `dispose()`。
- adapter 不添加调度、批处理、延迟或事务。框架可能延后 DOM 提交，但 Core 值和 adapter snapshot 会在同步通知期间更新。

### 保留 `Object.is` 与不可变更新

Core 是唯一的变化判断入口。重复设置 `NaN` 不会通知，而 `0` 与 `-0` 被视为不同值。对象与数组按引用判断：

```ts
const todos = atom([{ id: 1, done: false }]);

// 正确：创建新数组和新对象。
todos.set((items) => items.map((item) => (item.id === 1 ? { ...item, done: true } : item)));
```

不要原地修改后再传回同一个引用；adapter 不会替 Core 再做深比较。

### 按请求隔离 SSR 状态

服务端可变状态应由请求生命周期持有，不要把用户或请求相关 atom 放在服务器 module scope 中共享：

```ts
import { atom } from "@zhuangtai-js/core";

export function createRequestState(initialCount: number) {
  return {
    count: atom(initialCount),
  };
}
```

每个请求创建一次状态，再把同一请求的 atom 传入组件树。hydration 时，客户端初始值应与服务端输出一致。`@zhuangtai-js/persist` 默认读取 `localStorage`；服务端应传入明确的同步 storage，或只在客户端创建持久化 atom。

## Preact

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

`@zhuangtai-js/preact` 使用 `preact/hooks` 与 `preact/compat` 的两参数 `useSyncExternalStore`。`useAtomValue` 和 `useAtom` 订阅值；`useSetAtom` 只返回稳定 setter。`createAtomHook` 与 `createComputedHook` 适合把固定 atom 绑定成无参数 hook。

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);
  const reset = useSetAtom(countAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}
```

adapter 会缓存 snapshot，避免每次 `get()` 都创建新对象的 computed 造成读取循环。服务端渲染使用同一个不依赖浏览器 API 的 snapshot reader，并且不会建立订阅。应用仍需按请求创建 atom，并保证 hydration 初始状态一致。

## Svelte

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

`toReadable` 把 `ReadableAtom` 转成标准 `Readable`；`toWritable` 把可写 atom 转成标准 `Writable`。它们可直接交给 `$store`、`derived`、`get` 与 `readonly`，不使用 runes。

```svelte
<script lang="ts">
  import { atom, computed } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const double = toReadable(computed(() => countAtom.get() * 2));
</script>

<button on:click={() => count.update((value) => value + 1)}>
  {$count} × 2 = {$double}
</button>
```

`$store` 让 Svelte 管理订阅与清理；手动 `subscribe` 时必须调用 stopper。adapter 本身不访问浏览器 API，因此 SSR 边界取决于底层 atom：为每个请求创建 atom/store，不要在服务器 module scope 共享可变实例。

## Vue

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

`useAtomValue` 返回只读 `ComputedRef<Value>`，`useAtom` 返回 `[ComputedRef<Value>, setter]`，`useSetAtom` 只返回 setter。读取 API 必须在组件 `setup()`、`<script setup>`、`effectScope().run()` 或其他活动 effect scope 中调用；没有活动 scope 时会在读取或订阅前同步抛错。

adapter 使用浅 snapshot，保留 Core 中对象和数组的原始引用，不创建深层 Vue proxy。Core 通知时 `.value` 已同步更新；组件 DOM 仍遵循 Vue 自己的调度。

Vue SSR 的最终边界是：在 `createSSRApp` 的组件 `setup()` 中调用 `useAtomValue` 时，`renderToString` 路径只读取 `atom.get()` snapshot，不安装 Core watcher，也不建立订阅。只有客户端活动 effect scope 中的读取 API 才会订阅 Core，并由 `onScopeDispose` 注册的 scope cleanup 自动释放。不要为了组件 SSR 额外创建一个手动 `effectScope`；只有在组件 scope 之外显式创建客户端 scope 时，才需要自行调用 `scope.stop()`。

```ts
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { useAtomValue } from "@zhuangtai-js/vue";

const requestState = createRequestState(1);
const app = createSSRApp({
  setup() {
    const count = useAtomValue(requestState.count);
    return () => h("span", String(count.value));
  },
});

await renderToString(app); // SSR 只读取 snapshot，不建立 Core 订阅。
```

仍然要为每个请求创建 `requestState`；SSR 不建立订阅，且客户端 scope cleanup 也不等于自动隔离 module-level atom。

## Solid

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

`createAtomValue` 返回 `Accessor<Value>`，`createAtomSignal` 返回 `[Accessor<Value>, setter]`，`createSetAtom` 只返回 setter。客户端读取 API 必须在组件或 `createRoot` 中调用；客户端没有 owner 时会在读取或订阅前同步抛错。服务端标准 `renderToString` 回调不要求 owner。

```ts
import { createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomSignal } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const owned = createRoot((dispose) => {
  const [count, setCount] = createAtomSignal(countAtom);
  return { count, setCount, dispose };
});

owned.setCount((value) => value + 1);
owned.dispose();
```

adapter 的内部 signal 使用 `{ equals: false }`，因此只有 Core 的 `Object.is` 决定是否通知，并且函数、对象和数组保持原始引用。服务端先使用 `solid-js/web` 的公开 `isServer` 信号，标准 `renderToString(() => createAtomValue(source)...)` 直接读取 snapshot，不检查 owner、不建立 Core watcher，也不需要为 Solid 1.5 手工包 `createRoot`。客户端组件/root owner 订阅 Core 并由 `onCleanup` 停止，手动客户端 root 必须显式 dispose。每个请求仍应创建独立 atom。

## 什么时候直接使用 Core

以下情况通常不需要 adapter：

- SDK、数据层、命令、事件处理器、Web Component 或服务器逻辑不需要框架重渲染。
- 只需要同步 `get()` / `set()` / `watch()`，并且已有明确的手动清理位置。
- 希望同一份状态逻辑跨多个框架复用；把 Core atom 放在框架无关模块中，只在 UI 边界包装成对应 adapter。

只有当组件需要框架原生订阅、自动清理与模板/响应式集成时，才在 UI 边界使用 adapter。

## 下一步

- [Preact 参考](/reference/preact/)
- [Svelte 参考](/reference/svelte/)
- [Vue 参考](/reference/vue/)
- [Solid 参考](/reference/solid/)
- [集成与兼容性](/integrations/)
