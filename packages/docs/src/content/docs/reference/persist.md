---
title: Persist
description: "@zhuangtai-js/persist 的持久化插件 API。"
---

`@zhuangtai-js/persist` 为 `createAtom()` 创建的 atom creator 增加持久化能力。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});
```

## Storage

默认使用 `globalThis.localStorage`。也可以显式传入同步 Web Storage 风格的 `storage`。

```ts
const memory = new Map<string, string>();

const count = atom(0, {
  persist: {
    key: "count",
    storage: {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    },
  },
});
```

## Codec

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`。`undefined`、函数和 symbol 需要自定义 codec。

codec 或 storage 抛出的错误会直接冒泡给调用方；插件不会捕获、包装、记录或吞掉这些错误。
