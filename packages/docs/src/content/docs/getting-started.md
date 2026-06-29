---
title: 快速开始
description: 安装并使用 ZhuàngTài 的核心状态原语。
---

## 安装

```sh
pnpm add @zhuangtai-js/core
```

如果需要持久化插件：

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 创建状态

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(count, (value) => value * 2);

count.set(1);
count.set((value) => value + 1);

console.log(count.get());
console.log(double.get());
```

## 监听变化

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(3);
stop();
```

`watch()` 会立即用当前值同步调用一次回调。不要在同一个 atom 的 watcher 中再次调用该 atom 的 `set()`。
