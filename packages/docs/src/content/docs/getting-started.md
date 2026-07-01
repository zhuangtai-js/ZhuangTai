---
title: 快速开始
description: 安装 ZhuàngTài，创建第一个 atom，并按需添加持久化。
---

这个指南会带你完成一个最小的 ZhuàngTài 使用流程：安装核心包、创建状态、监听变化，并在需要时添加持久化插件。

## 安装核心包

使用你项目里的包管理器安装 `@zhuangtai-js/core`：

```sh
pnpm add @zhuangtai-js/core
```

`@zhuangtai-js/core` 没有第三方运行时依赖。

## 创建一个 atom

`atom()` 创建可读、可写、可监听的状态。

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get(); // 0
count.set(1);
count.set((value) => value + 1);
count.get(); // 2
```

`set()` 会立即更新值。如果传入函数，这个函数会被当作 updater，并接收当前值。

## 派生状态

使用 `computed()` 从一个或多个 atom 派生只读状态。

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);

double.get(); // 2

count.set(2);
double.get(); // 4
```

`computed()` 不会缓存过期值。调用 `get()` 时，它会基于当前 source 值重新计算。

## 监听变化

`watch()` 注册同步 watcher，并立即用当前值调用一次回调。

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(3);
stop();
```

不要在同一个 atom 的 watcher 中再次 `set()` 该 atom；这种自重入更新会抛错。watcher 可以更新其他 atom，但应避免形成循环。

## 添加持久化

需要把状态保存到同步 storage 时，安装 `@zhuangtai-js/persist`：

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

通过 `createAtom()` 创建可扩展的 atom creator，并安装 `persist` 插件。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

如果没有显式传入 `storage`，插件会使用 `globalThis.localStorage`。需要自定义存储或 codec 时，继续阅读 [Persist 参考](/reference/persist/)。

## 下一步

- 阅读 [Core 参考](/reference/core/) 了解完整核心 API。
- 阅读 [Persist 参考](/reference/persist/) 配置 storage 和 codec。
