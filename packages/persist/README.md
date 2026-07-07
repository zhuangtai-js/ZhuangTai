# @zhuangtai-js/persist

ZhuàngTài atom 的持久化插件。

`@zhuangtai-js/persist` 扩展来自 `@zhuangtai-js/core` 的 atom creator。它会在 atom 创建前恢复已存储的值，并在每次更新时先写入 storage、成功后再提交内存状态。

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
- 更新会先持久化：先用 codec 编码并写入 storage，成功后才提交内存状态并同步通知 watcher。
- 如果 encode 或 storage 写入失败，内存状态保持不变，并抛出错误。
- watcher 在提交阶段抛错时，值已经持久化且内存状态已更新（仅通知失败，不回滚）。
- `Object.is` 判定为无变化的更新不会写入 storage。
- 恢复已存储值时，若 codec decode 抛错，会包装成带出错 key 的错误（原错误保留在 `cause`），而不会静默回退到初始值。
- 省略 `storage` 且读取 `globalThis.localStorage` 抛错（如 SecurityError）时，会抛出提示传入显式 storage 的清晰错误（原错误保留在 `cause`）。
- 不支持异步 storage。

## 许可证

`@zhuangtai-js/persist` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

# @zhuangtai-js/persist

Persistence plugin for ZhuàngTài atoms.

`@zhuangtai-js/persist` extends atom creators from `@zhuangtai-js/core`. It restores a stored value before the atom is created and persists each update to storage before committing the in-memory state.

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
- Updates persist first: the value is encoded and written to storage, and only after a successful write is the in-memory state committed and watchers notified synchronously.
- If encode or the storage write fails, the in-memory state stays unchanged and the error is thrown.
- If a watcher throws during the commit phase, the value has already been persisted and the in-memory state has already been updated (only notification failed; there is no rollback).
- `Object.is` no-op updates do not write to storage.
- If the codec's decode throws while restoring a stored value, the failure is wrapped in an error that includes the offending key (the original error is preserved as `cause`); it does not silently fall back to the initial value.
- If `storage` is omitted and reading `globalThis.localStorage` throws (e.g. a SecurityError), a clear error is thrown advising you to pass an explicit storage option (the original error is preserved as `cause`).
- Async storage is not supported.

## License

`@zhuangtai-js/persist` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
