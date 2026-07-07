---
title: Core 参考
description: "@zhuangtai-js/core 的 atom、computed、createAtom 和核心类型。"
---

`@zhuangtai-js/core` 提供框架无关的状态原语。它没有第三方运行时依赖，也不会隐藏调度行为。

## 安装

```sh
pnpm add @zhuangtai-js/core
```

## `atom()`

创建可读、可写、可监听的状态。

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});
```

### `get()`

返回当前值。

```ts
const value = count.get();
```

### `set(nextValue)`

立即更新值。`nextValue` 可以是新值，也可以是 updater 函数。

```ts
count.set(1);
count.set((value) => value + 1);
```

不支持把函数作为 atom 值：`set(fn)` 会把 `fn` 当作 updater。定义 atom 时传入函数类型会产生类型错误；如需存储函数，请包一层对象，例如 `atom({ fn })`。

```ts
const fnAtom = atom({ fn: () => {} });
const nextFn = () => {};

fnAtom.set({ fn: nextFn });
```

### `watch(callback)`

同步注册 watcher，并立即用当前值调用一次回调。返回值用于取消监听。

```ts
const stop = count.watch((value, prevValue) => {
  console.log(value, prevValue);
});

stop();
```

同一个 atom 正在通知 watcher 时，再次 `set()` 该 atom 会抛错。watcher 可以更新其他 atom，但应避免形成循环。

## `computed()`

从一个或多个 atom 派生只读状态，依赖会根据 derive 内部实际读取的 `.get()` 自动发现。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(() => count.get() * 2);

double.get(); // 2
```

```ts
const firstName = atom("Ada");
const lastName = atom("Lovelace");

const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);
```

`computed()` 创建时会计算初始值。它只会在有 watcher 时订阅 source；调用 `get()` 时会基于当前 source 值重新计算。
`computed()` 会从 derive 内部实际调用的 `.get()` 自动发现依赖。订阅集合来自真实读取结果，所以不会出现声明的来源和实际读取的来源不一致。
条件分支下的依赖会自动切换。`computed(() => flag.get() ? a.get() : b.get())` 这类写法会在 `flag` 翻转时自动退订旧分支并订阅新分支。
跟踪只会发生在同步的 derive 里。`await` 之后或 `setTimeout` 里的读取不会被追踪，derive 应该保持同步。
嵌套 computed 会隔离依赖。外层在 `inner.get()` 上只依赖 `inner` 本身，不会把 inner 内部的源状态透传到外层。

## `createAtom()`

创建可安装插件的 atom creator。默认导出的 `atom()` 保持未扩展状态。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

插件安装在 creator 上，而不是安装在 atom 实例上。

## 核心类型

`@zhuangtai-js/core` 导出常用 public types：

- `Atom<Value>`
- `Computed<Value>`
- `ReadableAtom<Value>`
- `NextValue<Value>`
- `Watcher<Value>`
- `StopWatch`
- `AtomValue<Atom>`
- `AtomCreator`
- `AtomCreatorPlugin`
- `AtomCreatorPluginContext`

内部 creator 参数类型不会从包入口导出。

## 语义速查

- `set()` 立即生效。
- `watch()` 同步触发，并在注册时立即调用一次（`prevValue` 为 `undefined` 哨兵）。对 `Atom<T | undefined>` 无法据此区分首次通知与“上一个值恰好是 `undefined`”。
- 相等性使用 `Object.is`。
- 对象和数组更新按引用比较；请使用不可变更新。
- watcher 回调相互隔离：某个 watcher 抛错不中断本轮通知；全部跑完后，单个错误原样抛出，多个错误用 `AggregateError` 抛出。
- 在通知期间新增的 watcher 会立即以 `(currentValue, undefined)` 触发一次，但不加入本轮广播快照。
- 多来源 `computed` 是同步快照，非事务一致：逐个更新多个来源、或在 watcher 中更新其他来源时，可能观察到中间组合值；紧耦合的值请放进同一个 atom。
- `computed` 用 `Object.is` 比较派生结果；derive 每次返回新对象/数组会被判为已变化并可能重复通知，需抑制时请返回引用稳定的值。
- 插件按 id 幂等：`use()` 安装相同 id 的插件是 no-op；插件 id 必须全局唯一。
- 核心不做隐藏批处理、延迟、debounce 或 transaction。
