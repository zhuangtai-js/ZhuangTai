---
title: Persist
description: "Persistence plugin APIs from @zhuangtai-js/persist."
---

`@zhuangtai-js/persist` adds persistence to atom creators made with `createAtom()`.

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

The plugin uses `globalThis.localStorage` by default. You can also pass explicit synchronous Web Storage-style storage.

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

The default codec uses `JSON.stringify` and `JSON.parse`. Use a custom codec for `undefined`, functions, or symbols.

Errors thrown by the codec or storage are propagated to the caller. The plugin does not catch, wrap, log, or silence those errors.
