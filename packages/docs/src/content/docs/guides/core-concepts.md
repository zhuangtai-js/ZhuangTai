---
title: 核心概念
description: 认识 atom、computed、watch 和更新语义，建立 ZhuàngTài 的最小心智模型。
---

ZhuàngTài 的核心很小，但它的行为并不含糊。理解这几个概念之后，你就能判断什么时候该用一个 atom，什么时候该派生计算值，什么时候该把状态拆开，什么时候该把它们放回同一个 atom。

## atom 是什么

`atom()` 创建最小的状态单元。它既可读，又可写，还能被监听。

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
```

你可以把 atom 理解成一个带同步通知的值容器。它不依赖 React，也不依赖任何框架适配器。只要你拿到同一个 atom 引用，就读到同一份状态。

## computed 会自动追踪依赖

`computed()` 用来从一个或多个 atom 推导只读值。它不会让你手写依赖列表，而是根据 derive 里实际调用的 `.get()` 自动收集依赖。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const flag = atom(true);
const a = atom("A");
const b = atom("B");

const label = computed(() => (flag.get() ? a.get() : b.get()));
```

这里的关键点是条件分支。`flag` 从 `true` 变成 `false` 时，`computed` 会退订旧分支里的 `a`，改订阅新分支里的 `b`。它追踪的是这一次 derive 真的读了什么，而不是你“可能会读什么”。

依赖追踪只发生在同步 derive 里。`await` 之后或者 `setTimeout()` 里的读取不会被追踪，所以 derive 应该保持同步。

## watch 的语义

`watch()` 会同步注册一个 watcher，并立刻用当前值调用一次回调。回调会拿到 `value` 和 `prevValue`，返回值是一个取消订阅函数。

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

stop();
```

这意味着 watcher 不只是“稍后再通知”，而是马上进入当前调用栈。初始那次回调里，`prevValue` 是 `undefined` 哨兵值。对于 `Atom<T | undefined>`，你不能靠它区分“第一次通知”与“上一个值刚好是 `undefined`”。

watcher 之间是隔离的。某个 watcher 抛错，不会中断这一轮对其他 watcher 的通知。等所有 watcher 跑完后，若只有一个错误，原样抛出；如果有多个错误，就用 `AggregateError` 包起来抛出。

## set 立即生效，没有隐藏调度

`set()` 是立即的。它不会偷偷 batch，也不会延后到下一轮微任务，更不会替你引入事务边界。

```ts
count.set(1);
console.log(count.get()); // 1
```

这也是为什么你可以把 ZhuàngTài 当成“直接的状态原语”来用。调用 `set()` 后，当前值就已经变了，后续的 `get()` 读到的也是新值。

如果你把多个相关值拆成多个 atom，再逐个更新，就可能看到中间态。需要强一致的组合值时，把它们放进同一个 atom。

## Object.is 和不可变更新

ZhuàngTài 用 `Object.is` 判断变化。对对象和数组来说，这意味着更新是按引用比较的。你必须创建新对象或新数组，直接改原值不会产生变化。

```ts
import { atom } from "@zhuangtai-js/core";

const user = atom({ name: "阿元", tags: ["core"] });

// 错误：原地修改，引用没变。
user.get().name = "状态";
user.set(user.get());

// 正确：返回新对象和新数组。
user.set((prev) => ({
  ...prev,
  name: "状态",
  tags: [...prev.tags, "docs"],
}));
```

如果你原地改对象，`Object.is` 会认为前后一样，watcher 也不会看到变化。这个规则和 `freeze` 插件正好互补，前者告诉你“什么算变化”，后者帮你尽早发现“你是不是原地改了”。

## 下一步

- 阅读 [插件与组合](/guides/plugins/) ，了解 `createAtom()`、`.use(plugin)` 和多插件组合。
- 阅读 [Core 参考](/reference/core/) ，查看完整 API 和类型说明。
