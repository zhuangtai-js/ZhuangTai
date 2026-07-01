---
title: Persist Reference
description: Persistence plugin, storage, and codec options from @zhuangtai-js/persist.
---

`@zhuangtai-js/persist` adds synchronous persistence to atom creators made with `createAtom()`.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Install the plugin

Install `persist` on an atom creator.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

The default `atom()` export is not extended. Only atoms created with this creator accept `persist` options.

## Persist an atom

Pass `persist.key` to read a stored value before the atom is created and write future updates to storage.

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

If `storage.getItem(key)` returns `null`, the initial value passed to the atom is used.

## Configure storage

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

Custom `storage` objects need to implement `getItem`, `setItem`, and `removeItem`, matching the synchronous methods on `localStorage`. The current write flow only reads and writes values; `removeItem` is part of the storage interface to keep it Web Storage-compatible.

If no `storage` is provided and `globalThis.localStorage` is unavailable, atom creation throws.

## Configure codecs

The default codec uses `JSON.stringify` and `JSON.parse`.

```ts
const count = atom(0, {
  persist: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

The default codec only supports values that `JSON.stringify` returns as a string. `undefined`, functions, and symbols throw during encode instead of being passed to storage.

## Error semantics

Persistence writes happen after the underlying atom's `set()` returns normally.

- If a watcher throws during `set()`, in-memory state may already be updated, but storage is not written for that update.
- If the codec or storage throws, the error is propagated to the caller.
- The plugin does not catch, wrap, log, or silence storage failures.
- In-memory state is not rolled back after a persistence failure.

## Types

`@zhuangtai-js/persist` exports these public types:

- `PersistOptions`
- `PersistStorage`
- `PersistCodec`

`PersistStorage` is synchronous. Async storage is not supported.
