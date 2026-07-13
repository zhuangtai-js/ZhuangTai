# @zhuangtai-js/persist

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的持久化插件。

`@zhuangtai-js/persist` 扩展来自 `@zhuangtai-js/core` 的 atom creator。它会在 atom 创建前恢复已存储的值，并在每次更新时先写入 storage、成功后再提交内存状态。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/persist
# 或
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

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`，并在 encode 前做 fail-fast 校验：

- `NaN`、`±Infinity` 以及嵌套中的非有限数字会同步抛错，而不会静默写成 `null`。
- 无效 `Date`（`getTime()` 非有限）会同步抛错，而不会静默写成 `null`。
- 顶层 `undefined`、函数和 symbol 会在 encode 时抛错，而不是传给 storage。
- 对象字段里的 `undefined` 仍遵循 JSON 语义（键会被省略）；需要保留时请用自定义 codec。

需要不同存储表示时，请传入自定义 codec。

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

## 版本化持久化

版本化持久化是可选功能。传入正安全整数 `version` 后，插件会把 codec 生成的字符串 payload 包装在带标记的 JSON 记录中。未传 `version` 时，现有原始存储字节和行为保持不变。

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = { readonly theme: string };
type Settings = { readonly theme: string; readonly density: "comfortable" | "compact" };

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    typeof value.theme === "string"
  );
}

const settings = atom<Settings>(
  { theme: "light", density: "comfortable" },
  {
    persist: {
      key: "settings",
      version: 1,
      migrations: {
        0: definePersistMigration((value) => {
          if (!isSettingsV0(value)) {
            throw new TypeError("Invalid SettingsV0 stored value.");
          }

          return { ...value, density: "comfortable" };
        }),
      },
    },
  },
);
```

- 没有版本标记的旧数据视为版本 `0`。
- `migrations[n]` 负责把版本 `n` 前向迁移到版本 `n + 1`；所有步骤都会同步、按顺序执行。
- 迁移完成后，插件会先用 codec 编码迁移结果并写回当前版本记录；写入成功后再解码该 payload，得到内存 `Value` 并创建 atom。
- 当前版本记录会直接恢复，不迁移也不重写。
- 未来版本、缺失的迁移步骤和形状不精确的带标记记录会同步抛错。
- 迁移、codec 或 storage 失败时，错误会包含 key 和相关版本；原错误保留在 `cause`。
- 自定义 codec 只负责 envelope 内的 `payload`；envelope 本身始终是精确的 JSON 对象：`{"__zhuangtai_persist__":true,"version":1,"payload":"..."}`。

`PersistMigration` 的输入和返回值都位于 storage 边界，类型分别是 `unknown`。迁移函数必须先解析或收窄输入，再访问旧结构；不能把窄输入函数（例如 `(value: string) => unknown`）直接放进 migrations。`definePersistMigration<Value>` 是运行时 identity helper：回调参数始终是 `unknown`，可选的 `Value` 泛型只约束返回值，不做运行时校验，也不把 atom 的 `Value` 泛型放进插件选项类型。

## 语义

- 省略 `persist` 选项时，atom 保持不变。
- 已存储的值会在第一次 `get()` 前恢复。传入 `version` 时会启用同步的前向迁移和写回。
- 更新会先持久化：先用 codec 编码并写入 storage，成功后才提交内存状态并同步通知 watcher。
- 如果 encode 或 storage 写入失败，内存状态保持不变，并抛出错误。
- 默认 JSON codec 拒绝非有限数字和无效 `Date`，避免 JSON 把它们静默变成 `null`。
- watcher 在提交阶段抛错时，值已经持久化且内存状态已更新（仅通知失败，不回滚）。
- `Object.is` 判定为无变化的更新不会写入 storage。
- 恢复已存储值时，若 codec decode 抛错，会包装成带出错 key 的错误（原错误保留在 `cause`），而不会静默回退到初始值。
- 省略 `storage` 且读取 `globalThis.localStorage` 抛错（如 SecurityError）时，会抛出提示传入显式 storage 的清晰错误（原错误保留在 `cause`）。
- 不支持异步 storage。

## 许可证

`@zhuangtai-js/persist` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/persist

Persistence plugin for ZhuàngTài atoms.

`@zhuangtai-js/persist` extends atom creators from `@zhuangtai-js/core`. It restores a stored value before the atom is created and persists each update to storage before committing the in-memory state.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/persist
# or
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

Values are encoded with `JSON.stringify` and decoded with `JSON.parse` by default, with fail-fast checks before encode:

- `NaN`, `±Infinity`, and nested non-finite numbers throw synchronously instead of being silently stored as `null`.
- Invalid `Date` values (`getTime()` is non-finite) throw synchronously instead of being silently stored as `null`.
- Top-level `undefined`, functions, and symbols throw during encode instead of being passed to storage.
- `undefined` fields inside objects still follow JSON semantics (keys are omitted); use a custom codec when you need to preserve them.

Pass a custom codec when your stored representation needs different behavior.

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

## Versioned persistence

Versioned persistence is opt-in. When a positive safe integer `version` is provided, the plugin wraps the codec-produced string payload in a marked JSON record. Without `version`, existing raw storage bytes and behavior remain unchanged.

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = { readonly theme: string };
type Settings = { readonly theme: string; readonly density: "comfortable" | "compact" };

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    typeof value.theme === "string"
  );
}

const settings = atom<Settings>(
  { theme: "light", density: "comfortable" },
  {
    persist: {
      key: "settings",
      version: 1,
      migrations: {
        0: definePersistMigration((value) => {
          if (!isSettingsV0(value)) {
            throw new TypeError("Invalid SettingsV0 stored value.");
          }

          return { ...value, density: "comfortable" };
        }),
      },
    },
  },
);
```

- Legacy data without a version marker is treated as version `0`.
- `migrations[n]` migrates version `n` forward to version `n + 1`; every step runs synchronously and in order.
- After migration, the plugin encodes the migrated result and writes back the current-version record first; only after that write succeeds does it decode the payload into the in-memory `Value` and create the atom.
- A current-version record is restored directly without migration or rewriting.
- Future versions, missing migration steps, and marked records without the exact envelope shape throw synchronously.
- Migration, codec, and storage failures include the key and relevant versions; the original error is preserved as `cause`.
- A custom codec only controls the envelope's `payload`; the envelope itself is always the exact JSON object `{"__zhuangtai_persist__":true,"version":1,"payload":"..."}`.

`PersistMigration` receives and returns values across the storage boundary, so both sides are `unknown`. A migration must parse or narrow its input before reading the legacy shape; a narrow-input function such as `(value: string) => unknown` cannot be assigned to `migrations`. `definePersistMigration<Value>` is a runtime identity helper whose callback input is always `unknown`; the optional `Value` generic only constrains the return value. It performs no runtime validation and does not put the atom's `Value` generic into the plugin options type.

## Semantics

- Omitting `persist` options leaves the atom unchanged.
- Stored values are restored before the first `get()`. Providing `version` enables synchronous forward migration and write-back.
- Updates persist first: the value is encoded and written to storage, and only after a successful write is the in-memory state committed and watchers notified synchronously.
- If encode or the storage write fails, the in-memory state stays unchanged and the error is thrown.
- The default JSON codec rejects non-finite numbers and invalid `Date` values so JSON cannot silently turn them into `null`.
- If a watcher throws during the commit phase, the value has already been persisted and the in-memory state has already been updated (only notification failed; there is no rollback).
- `Object.is` no-op updates do not write to storage.
- If the codec's decode throws while restoring a stored value, the failure is wrapped in an error that includes the offending key (the original error is preserved as `cause`); it does not silently fall back to the initial value.
- If `storage` is omitted and reading `globalThis.localStorage` throws (e.g. a SecurityError), a clear error is thrown advising you to pass an explicit storage option (the original error is preserved as `cause`).
- Async storage is not supported.

## License

`@zhuangtai-js/persist` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
