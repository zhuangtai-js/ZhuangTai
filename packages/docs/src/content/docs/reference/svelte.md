---
title: Svelte 参考
description: "@zhuangtai-js/svelte 的标准 store 转换、订阅生命周期与 SSR 边界。"
---

`@zhuangtai-js/svelte` 把 Core atom 和 computed 转换为标准 `svelte/store` 对象，不添加 runes 或额外调度。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

peer 范围是 `@zhuangtai-js/core ^0.5.0` 与 Svelte `>=4.2 <6`。

## `toReadable(source)`

把可写 atom 或 computed 这样的 `ReadableAtom<Value>` 转为 Svelte `Readable<Value>`。

```ts
import { atom, computed } from "@zhuangtai-js/core";
import { toReadable } from "@zhuangtai-js/svelte";

const countAtom = atom(1);
const double = toReadable(computed(() => countAtom.get() * 2));
```

`subscribe(run, invalidate?)` 直接连接 Core `watch`。由于 `watch` 会同步发送当前值，`run` 在订阅时同步且只运行一次；后续通知先调用可选 invalidator，再调用 `run`。

## `toWritable(source)`

把可写 `Atom<Value>` 转为 Svelte `Writable<Value>`。

```ts
import { toWritable } from "@zhuangtai-js/svelte";

const count = toWritable(countAtom);
count.set(2);
count.update((value) => value + 1);
```

`set(value)` 直接调用 Core `set(value)`。`update(updater)` 把 updater 交给 Core，因此它读取执行时的最新值。

## 使用原生 Svelte store API

```svelte
<script lang="ts">
  import { derived, readonly } from "svelte/store";
  import { atom } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const visibleCount = readonly(count);
  const label = derived(toReadable(countAtom), (value) => `Count: ${value}`);
</script>

<button on:click={() => count.update((value) => value + 1)}>{$label}</button>
```

转换后的对象可用于 `$store`、`derived`、`get`、`readonly` 与其他 `svelte/store` API。

## 生命周期与错误

- `$store` 自动订阅与取消订阅。手动 `subscribe` 时保存并调用返回的 stopper。
- stopper 直接来自 Core `watch`，调用后立即停止后续通知。
- subscriber、invalidator 或 Core 抛出的错误保持同步传播，不会被 adapter 替换。
- adapter 不创建跨 atom 的共享状态。

## 相等性与更新

adapter 不再次比较值。Core 的 `Object.is` 决定通知：重复 `NaN` 不通知，`0` 与 `-0` 不相等。对象和数组按引用判断，必须使用 immutable（不可变）更新。没有调度、批处理、延迟或事务。

## SSR

adapter 本身不访问浏览器 API，普通 store contract 可在服务端使用。真正的边界是状态所有权：为每个请求创建 atom 和转换后的 store，不要在服务器 module scope 共享用户相关可变状态。hydration 时应使用与服务端输出一致的初始值。

`@zhuangtai-js/persist` 默认访问 `localStorage`，因此服务端需要显式同步 storage，或只在客户端创建持久化 atom。

## 什么时候直接使用 Core

如果代码不需要 `$store`、`derived` 或 Svelte 自动生命周期，直接使用 Core。常见位置包括服务器 loader、共享数据层、SDK 与框架无关模块。
