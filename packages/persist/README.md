# @zhuangtai-js/persist

ZhuàngTài atom 的持久化插件。

`@zhuangtai-js/persist` 扩展来自 `@zhuangtai-js/core` 的 atom creator。它会在 atom 创建前恢复已存储的值，并在底层 atom 的 `set()` 正常返回后写入最新值。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 使用

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

持久化使用同步的 Web Storage 兼容存储。自定义 `storage` 需要实现 `getItem`、`setItem` 和 `removeItem`，与 `localStorage` 的同步方法保持一致。

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

如果省略 `storage`，插件会使用 `globalThis.localStorage`。如果两者都不可用，atom 创建会抛错。

## Codec

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`。默认 codec 只支持 `JSON.stringify` 返回字符串的值；`undefined`、函数和 symbol 会在 encode 时抛错，而不是传给 storage。需要不同存储表示时，请传入自定义 codec。

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

## 语义

- 省略 `persist` 选项时，atom 保持不变。
- 已存储的值会在第一次 `get()` 前恢复。
- 底层 atom 的 `set()` 正常返回后，会同步写入 storage。
- 如果 watcher 在 `set()` 过程中抛错，内存状态可能已经更新，但本次不会写入 storage。
- `Object.is` 判定为无变化的更新不会写入 storage。
- Codec 和 storage 错误会直接冒泡给调用方。插件不会捕获、包装、记录或吞掉 storage 失败，持久化失败后也不会回滚内存状态。
- 不支持异步 storage。

## 许可证

`@zhuangtai-js/persist` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

# @zhuangtai-js/persist

Persistence plugin for ZhuàngTài atoms.

`@zhuangtai-js/persist` extends atom creators from `@zhuangtai-js/core`. It restores a stored value before the atom is created and writes the latest value after the underlying atom's `set()` returns normally.

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

Persistence uses synchronous Web Storage-compatible storage. Custom `storage` objects need to implement `getItem`, `setItem`, and `removeItem`, matching the synchronous methods on `localStorage`.

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
- Writes happen synchronously after the underlying atom's `set()` returns normally.
- If a watcher throws during `set()`, in-memory state may already be updated, but storage is not written for that update.
- `Object.is` no-op updates do not write to storage.
- Codec and storage errors are propagated to the caller. The plugin does not catch, wrap, log, or silence storage failures, and in-memory state is not rolled back after a persistence failure.
- Async storage is not supported.

## License

`@zhuangtai-js/persist` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
