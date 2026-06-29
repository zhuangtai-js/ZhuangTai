# @zhuangtai-js/persist

Persistence plugin for ZhuàngTài atoms.

`@zhuangtai-js/persist` extends atom creators from `@zhuangtai-js/core`. It restores a stored value before the atom is created and writes the final value after successful `set` calls.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Usage

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.get();
theme.set("dark");
```

## Storage

Persistence uses synchronous Web Storage-compatible storage:

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

If `storage` is omitted, the plugin uses `globalThis.localStorage`. If neither is available, atom creation throws.

## Codec

Values are encoded with `JSON.stringify` and decoded with `JSON.parse` by default. The default codec only supports values that `JSON.stringify` returns as a string; `undefined`, functions, and symbols throw during encode instead of being passed to storage. Pass a custom codec when your stored representation needs different behavior.

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

## Semantics

- Omitting `persist` options leaves the atom unchanged.
- Stored values are restored before the first `get()`.
- Writes happen synchronously after `set` changes the value.
- `Object.is` no-op updates do not write to storage.
- Async storage is not supported.
