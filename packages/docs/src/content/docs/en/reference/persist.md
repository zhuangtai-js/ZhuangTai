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

The default codec uses `JSON.stringify` and `JSON.parse`, and rejects `NaN`, `±Infinity`, and invalid `Date` values before encode (JSON would otherwise silently turn them into `null`). Top-level `undefined`, functions, and symbols also throw during encode. Pass a custom codec when you need those special values.

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

Top-level `undefined`, functions, and symbols throw during encode instead of being passed to storage. `undefined` fields inside objects still follow JSON semantics (keys are omitted).

## Error semantics

Updates persist first: the value is encoded and written to storage, and only after a successful write is the in-memory state committed and watchers notified synchronously.

- If encode or the storage write fails, the in-memory state stays unchanged and the error is thrown.
- If a watcher throws during the commit phase, the value has already been persisted and the in-memory state has already been updated (only notification failed; there is no rollback).
- `Object.is` no-op updates do not write to storage.
- If the codec's decode throws while restoring a stored value, the failure is wrapped in an error that includes the offending key (the original error is preserved as `cause`); it does not silently fall back to the initial value.
- If `storage` is omitted and reading `globalThis.localStorage` throws (e.g. a SecurityError), a clear error is thrown advising you to pass an explicit storage option (the original error is preserved as `cause`).

## Types

`@zhuangtai-js/persist` exports these public types:

- `PersistOptions`
- `PersistStorage`
- `PersistCodec`

`PersistStorage` is synchronous. Async storage is not supported.
