---
title: Core
description: "@zhuangtai-js/core 的核心 API。"
---

`@zhuangtai-js/core` 提供框架无关的状态原语。

## atom

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});
```

语义：

- `set()` 立即更新值。
- `watch()` 同步触发，并在注册时立即调用一次。
- 值比较使用 `Object.is`。
- 对象和数组按引用比较。
- 函数值需要用 `set(() => fn)` 存储。
- 同一个 atom 正在通知 watcher 时，再次 `set()` 该 atom 会抛错。

## computed

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);
```

`computed()` 创建时会计算初始值；只有存在 watcher 时才订阅 source；`get()` 会从当前 source 重新计算。
