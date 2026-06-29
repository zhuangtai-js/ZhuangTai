---
title: Getting Started
description: Install and use ZhuàngTài state primitives.
---

## Install

```sh
pnpm add @zhuangtai-js/core
```

For persistence support:

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Create state

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(count, (value) => value * 2);

count.set(1);
count.set((value) => value + 1);

console.log(count.get());
console.log(double.get());
```

## Watch changes

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(3);
stop();
```

`watch()` synchronously calls the callback with the current value when registered. Do not call `set()` for the same atom from inside that atom's watcher.
