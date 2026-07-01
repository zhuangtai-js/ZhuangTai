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

函数值有 setter 歧义：`set(fn)` 会把 `fn` 当作 updater。如果要存储函数值，请包一层。

```ts
const fnAtom = atom<() => void>(() => {});
const nextFn = () => {};

fnAtom.set(() => nextFn);
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

从一个或多个 source atom 派生只读状态。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);

double.get(); // 2
```

多个 source 使用只读数组传入。

```ts
const firstName = atom("Ada");
const lastName = atom("Lovelace");

const fullName = computed([firstName, lastName] as const, (first, last) => `${first} ${last}`);
```

`computed()` 创建时会计算初始值。它只会在有 watcher 时订阅 source；调用 `get()` 时会基于当前 source 值重新计算。

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
- `AtomValues<Sources>`
- `AtomCreator`
- `AtomCreatorPlugin`
- `AtomCreatorPluginContext`

内部 creator 参数类型不会从包入口导出。

## 语义速查

- `set()` 立即生效。
- `watch()` 同步触发，并在注册时立即调用一次。
- 相等性使用 `Object.is`。
- 对象和数组更新按引用比较；请使用不可变更新。
- 核心不做隐藏批处理、延迟、debounce 或 transaction。
