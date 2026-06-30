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

The plugin uses `globalThis.localStorage` by default. You can also pass explicit synchronous Web Storage-style storage. Custom `storage` objects need to implement `getItem`, `setItem`, and `removeItem`, matching the synchronous methods on `localStorage`.

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

Writes happen synchronously after the underlying atom's `set()` returns normally. If a watcher throws during `set()`, in-memory state may already be updated, but storage is not written for that update.

Errors thrown by the codec or storage are propagated to the caller. The plugin does not catch, wrap, log, or silence those errors.
