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
- Codec and storage errors are propagated to the caller. The plugin does not catch, wrap, log, or silence storage failures, and in-memory state is not rolled back after a persistence failure.
- Async storage is not supported.

## 许可证

`@zhuangtai-js/persist` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

## License

`@zhuangtai-js/persist` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
