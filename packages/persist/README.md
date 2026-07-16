# @zhuangtai-js/persist

<p align="center">简体中文 · <a href="#english">English</a></p>

ZhuàngTài atom 的持久化插件。

`@zhuangtai-js/persist` 为 `@zhuangtai-js/core` 的 atom creator 增加持久化。它支持同步 storage，也支持返回 `PromiseLike` 的通用异步 storage；Core 的 `set` 和 `watch` 语义仍保持同步。

## 安装

```sh
npm install @zhuangtai-js/core @zhuangtai-js/persist
# 或
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 框架快速开始

- [React 快速指南](https://zhuangtai.yojigen.cn/guides/react/)
- [Preact 快速指南](https://zhuangtai.yojigen.cn/guides/preact/)
- [Vue 快速指南](https://zhuangtai.yojigen.cn/guides/vue/)
- [Svelte 快速指南](https://zhuangtai.yojigen.cn/guides/svelte/)
- [Solid 快速指南](https://zhuangtai.yojigen.cn/guides/solid/)
- [React Native / Expo 快速指南](https://zhuangtai.yojigen.cn/guides/react-native-expo/)

React Native / Expo 使用 `@zhuangtai-js/react`；应用消费者可以单独提供自己的 PromiseLike storage，例如 AsyncStorage。这里没有 ZhuàngTài 专用的 AsyncStorage 包。

## 基本用法

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

## 同步与异步 storage

`PersistStorage` 是结构化契约，不绑定某个存储库或运行时。`getItem`、`setItem` 和 `removeItem` 每次调用都可以返回普通值或 `PromiseLike` 值：

```ts
import type { PersistStorage } from "@zhuangtai-js/persist";

const memory = new Map<string, string>();

const storage: PersistStorage = {
  getItem: (key) => Promise.resolve(memory.get(key) ?? null),
  setItem: (key, value) =>
    Promise.resolve().then(() => {
      memory.set(key, value);
    }),
  removeItem: (key) =>
    Promise.resolve().then(() => {
      memory.delete(key);
    }),
};
```

插件会按每次调用的返回值检测 thenable，因此同一个 storage 可以混合使用同步和异步方法。

| 场景                                   | 行为                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `getItem` 返回普通值                   | 在 atom creator 返回前完成恢复；更新保持同步的“encode → 写入 → 内存提交 → watcher”顺序。               |
| `getItem` 返回 thenable                | 立即用 `initialValue` 创建 atom，再进行异步 hydration；`persist.ready(atom)` 等待当前 hydration 完成。 |
| `setItem` / `removeItem` 返回 thenable | `set`、`watch` 仍同步执行；写入按调用顺序排队，异步失败通过 `onError` 和 `persist.flush()` 观察。      |

使用异步 storage 时，`set()` 不会等待 Promise。它先编码新值，再把 storage 写入加入队列，然后同步提交内存值并通知 watcher。编码失败，或 `setItem` 在这次原始 `set()` 同步调用内抛错，都会同步 fail-closed：内存值不提交，watcher 不通知。如果写入排在已有异步工作之后，`setItem` 直到队列执行时才抛错；相对于原始 `set()`，这是 queued deferred failure，本地内存提交会保留，并由 `onError` 与 `flush()` 报告。

## 生命周期 controller

`persist` 导出同一个带 controller 方法的插件对象：

```ts
await persist.ready(theme);
await persist.flush(theme);
await persist.rehydrate(theme);
await persist.clear(theme);
```

- `ready(atom)` 等待最新一代 hydration。异步读取、迁移或迁移写回失败时会 reject。
- `flush(atom)` 等待 hydration、controller 操作和所有排队写入；如果有保留的失败，它 reject 第一个失败，然后清空这批失败记录。
- `rehydrate(atom)` 返回 lifecycle Promise 并开始新一代读取。旧一代的迟到结果不会覆盖新结果；内部 `getItem` 即使同步抛错，也会表现为这个 Promise reject。
- hydration 期间发生本地更新时，本地值获胜；读取结束后会把最新本地值写入 storage。
- `clear(atom)` 返回 lifecycle Promise，等待 hydration 和排队写入完成后再调用 `removeItem`。内部 `removeItem` 即使同步抛错，也会表现为这个 Promise reject；它不会重置内存中的 atom 值。
- 对没有由本插件创建的 atom 使用这些方法会抛出 `TypeError`。

异步写入按 `set()` 的逻辑顺序串行执行。某次写入失败不会阻止后续写入；失败会保留到下一次 `flush()`，并可通过每个 atom 的 `onError` 逐次接收。

## SSR 与 hydration

浏览器中默认 storage 是 `globalThis.localStorage`，也可以传入方法返回 `PromiseLike` 的 storage。SSR 环境没有可用的浏览器 storage 时，请传入请求或客户端明确拥有的 storage，或只在客户端创建持久化 atom。

异步 storage 会先使用 `initialValue`，直到 hydration 完成。需要稳定 SSR 输出时，让服务端和客户端先使用相同的初始状态，再在客户端根据 `persist.ready(atom)` 显示已恢复内容；不要在服务端渲染阶段直接读取浏览器专属 storage。

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

## 版本化持久化与迁移

版本化持久化是可选功能。传入正安全整数 `version` 后，插件会把 codec 生成的字符串 payload 包装在带标记的 JSON 记录中。没有版本标记的旧数据按版本 `0` 处理。

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

- `migrations[n]` 把版本 `n` 前向迁移到版本 `n + 1`；每一步都同步、确定且按顺序运行。
- 异步 storage 只让读取和写回异步；migration 回调本身仍然同步。
- 迁移完成后，插件先 encode 并写回当前版本记录，再把 payload decode 成内存 `Value`。异步写回完成前，hydrated 值不会提交，`persist.ready()` 也不会 resolve。
- 如果本地更新在 hydration 或迁移期间获胜，不会应用或写回过期的迁移结果；插件会保存最新本地值。
- 当前版本记录直接恢复，不迁移也不重写。未来版本、缺失步骤和形状不精确的带标记记录会在恢复边界失败：同步 creator 路径会同步抛错，异步 hydration 或 `rehydrate()` 路径会让对应 Promise reject。
- 自定义 codec 只负责 envelope 内的 `payload`；envelope 本身始终是精确的 JSON 对象：`{"__zhuangtai_persist__":true,"version":1,"payload":"..."}`。

`PersistMigration` 的输入来自 storage 边界，类型是 `unknown`。迁移函数必须先解析或收窄输入，再访问旧结构；不能把窄输入函数（例如 `(value: string) => unknown`）直接放进 `migrations`。`definePersistMigration<Value>` 是运行时 identity helper：回调参数始终是 `unknown`，可选的 `Value` 泛型只约束返回值，不做运行时校验，也不把 atom 的 `Value` 泛型放进插件选项类型。

## 错误处理与语义

- 省略 `persist` 选项时，atom 保持不变。
- `onError(error)` 按 atom 配置，针对每一次失败的异步 hydration、异步或排队写入、迁移写回、`rehydrate` 或 `clear` 调用一次；creator 或本地 `set()` 原始同步调用内的抛错会直接传播，不经过 `onError`。
- 异步错误会包装为带有操作和 key 上下文的错误，原始错误保留在 `cause`；不会产生未处理的 rejection。
- atom creator 调用中的同步 `getItem`、恢复、migration 或 migration write-back 失败会同步 fail-closed：旧 storage 保持不变，也不会返回 atom。
- 本地 `set()` 中，encode 或立即调用的 `setItem` 同步抛错时，`set()` 同步 fail-closed：内存状态保持不变，watcher 不会收到通知。
- `rehydrate()` 和 `clear()` 始终返回 lifecycle Promise；内部 `getItem` 或 `removeItem` 即使同步抛错，也会让返回的 Promise reject，并通过 `onError` 记录。
- 排在已有异步工作之后的 `setItem` 在队列执行时同步抛错或返回 rejected Promise，属于 queued deferred write error：原始 `set()` 已提交的内存值会保留，错误由 `onError` 和下一次 `flush()` 暴露，后续写入仍会继续。
- `Object.is` 判定为无变化的更新不会写入 storage。
- watcher 在提交阶段抛错时，storage 和内存已经更新，不会回滚。
- 恢复已存储值时，如果 codec decode 抛错，会包装成带 key 的错误，原错误保留在 `cause`，不会静默回退到初始值。
- 省略 `storage` 且读取 `globalThis.localStorage` 抛错时，会提示传入显式 storage，并保留原错误为 `cause`。

## Public types

- `MaybePromise<Value>`
- `PersistStorage`
- `PersistOptions`
- `PersistControls`
- `PersistCodec`
- `PersistMigration`

`PersistControls` 提供 `ready`、`flush`、`rehydrate` 和 `clear`。所有 storage 方法都使用 `MaybePromise`，所以既能接受同步实现，也能接受返回 `PromiseLike` 的实现。

## 许可证

`@zhuangtai-js/persist` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

<a id="english"></a>

# @zhuangtai-js/persist

Persistence plugin for ZhuàngTài atoms.

`@zhuangtai-js/persist` adds persistence to atom creators from `@zhuangtai-js/core`. It supports synchronous storage and generic storage methods that return `PromiseLike` values, while Core `set` and `watch` semantics remain synchronous.

## Install

```sh
npm install @zhuangtai-js/core @zhuangtai-js/persist
# or
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Framework quick starts

- [React Quick Start](https://zhuangtai.yojigen.cn/en/guides/react/)
- [Preact Quick Start](https://zhuangtai.yojigen.cn/en/guides/preact/)
- [Vue Quick Start](https://zhuangtai.yojigen.cn/en/guides/vue/)
- [Svelte Quick Start](https://zhuangtai.yojigen.cn/en/guides/svelte/)
- [Solid Quick Start](https://zhuangtai.yojigen.cn/en/guides/solid/)
- [React Native / Expo Quick Start](https://zhuangtai.yojigen.cn/en/guides/react-native-expo/)

React Native / Expo uses `@zhuangtai-js/react`; the app consumer can provide its own PromiseLike storage, such as AsyncStorage, separately. There is no ZhuàngTài-specific AsyncStorage package.

## Basic usage

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

## Synchronous and asynchronous storage

`PersistStorage` is a structural contract and is not tied to a storage library or runtime. Each call to `getItem`, `setItem`, and `removeItem` may return either a plain value or a `PromiseLike` value:

```ts
import type { PersistStorage } from "@zhuangtai-js/persist";

const memory = new Map<string, string>();

const storage: PersistStorage = {
  getItem: (key) => Promise.resolve(memory.get(key) ?? null),
  setItem: (key, value) =>
    Promise.resolve().then(() => {
      memory.set(key, value);
    }),
  removeItem: (key) =>
    Promise.resolve().then(() => {
      memory.delete(key);
    }),
};
```

The plugin detects thenables from each call, so one storage object may mix synchronous and asynchronous methods.

| Scenario                                    | Behavior                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getItem` returns a plain value             | Restoration completes before the atom creator returns; updates keep the synchronous “encode → write → memory commit → watcher” order.                    |
| `getItem` returns a thenable                | The atom is created immediately with `initialValue`, then hydrated asynchronously; `persist.ready(atom)` waits for the current hydration.                |
| `setItem` / `removeItem` returns a thenable | `set` and `watch` remain synchronous; writes are queued in call order, and asynchronous failures are observable through `onError` and `persist.flush()`. |

With asynchronous storage, `set()` does not wait for a Promise. It encodes the new value, queues the storage write, then synchronously commits memory and notifies watchers. An encode failure, or a `setItem` throw inside the original synchronous `set()` call, fails closed synchronously: memory is not committed and watchers are not notified. If the write is placed behind existing asynchronous work, `setItem` is not invoked until the queue runs it; a throw at that point is a queued deferred failure relative to the original `set()`, so the local memory commit remains and `onError` plus `flush()` report it.

## Lifecycle controller

`persist` exports one plugin object with lifecycle controller methods:

```ts
await persist.ready(theme);
await persist.flush(theme);
await persist.rehydrate(theme);
await persist.clear(theme);
```

- `ready(atom)` waits for the latest hydration generation. It rejects when asynchronous reading, migration, or migration write-back fails.
- `flush(atom)` waits for hydration, controller operations, and queued writes. If failures were retained, it rejects with the first failure and then clears that batch.
- `rehydrate(atom)` returns a lifecycle Promise and starts a new read generation. Late results from older generations cannot overwrite the newer result; even if its internal `getItem` throws synchronously, the returned Promise rejects.
- If a local update happens during hydration, the local value wins; the latest local value is written after the read completes.
- `clear(atom)` returns a lifecycle Promise, waits for hydration and queued writes, then calls `removeItem`. Even if the internal `removeItem` throws synchronously, the returned Promise rejects; it does not reset the atom's in-memory value.
- Calling these methods with an atom not created by this plugin throws a `TypeError`.

Asynchronous writes are serialized in logical `set()` order. One rejected write does not stop later writes; failures remain available until the next `flush()`, and each failed operation can be reported through the atom's `onError` callback.

## SSR and hydration

The default browser storage is `globalThis.localStorage`, and custom storage methods may return `PromiseLike` values. When SSR has no usable browser storage, pass storage explicitly owned by the request or client, or create the persisted atom only on the client.

Asynchronous storage starts from `initialValue` until hydration finishes. For stable SSR output, let server and client start from the same initial state, then show restored content on the client after `persist.ready(atom)`; do not read browser-only storage during server rendering.

## Codec

The default codec uses `JSON.stringify` and `JSON.parse`, with fail-fast checks before encode:

- `NaN`, `±Infinity`, and nested non-finite numbers throw synchronously instead of being silently stored as `null`.
- Invalid `Date` values (`getTime()` is non-finite) throw synchronously instead of being silently stored as `null`.
- Top-level `undefined`, functions, and symbols throw during encode instead of being passed to storage.
- `undefined` fields inside objects follow JSON semantics (keys are omitted); use a custom codec when you need to preserve them.

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

## Versioned persistence and migration

Versioned persistence is opt-in. When a positive safe integer `version` is provided, the plugin wraps the codec-produced string payload in a marked JSON record. Legacy data without a version marker is treated as version `0`.

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

- `migrations[n]` migrates version `n` forward to version `n + 1`; every step runs synchronously, deterministically, and in order.
- Asynchronous storage only makes reads and write-back asynchronous; migration callbacks remain synchronous.
- After migration, the plugin encodes and writes the current-version record before decoding the payload into the in-memory `Value`. During asynchronous hydration, the write-back must finish before the hydrated value is committed and `persist.ready()` resolves.
- If a local update wins during hydration or migration, stale migration data is not applied or written back; the latest local value is retained.
- A current-version record is restored directly without migration or rewriting. Future versions, missing steps, and marked records without the exact envelope shape fail at the restoration boundary: the synchronous creator path throws synchronously, while asynchronous hydration or `rehydrate()` rejects the corresponding Promise.
- A custom codec controls only the envelope's `payload`; the envelope itself is always the exact JSON object `{"__zhuangtai_persist__":true,"version":1,"payload":"..."}`.

`PersistMigration` receives data from the storage boundary as `unknown`. A migration must parse or narrow its input before reading the legacy shape; a narrow-input function such as `(value: string) => unknown` cannot be assigned to `migrations`. `definePersistMigration<Value>` is a runtime identity helper whose callback input is always `unknown`; the optional `Value` generic only constrains the return value. It performs no runtime validation and does not put the atom's `Value` generic into the plugin options type.

## Error handling and semantics

- Omitting `persist` options leaves the atom unchanged.
- `onError(error)` is configured per atom and is called once for each failed asynchronous hydration, asynchronous or queued write, migration write-back, `rehydrate`, or `clear` operation. A throw inside the original synchronous creator or local `set()` call propagates directly and does not go through `onError`.
- Asynchronous failures are wrapped with operation and key context, with the original error preserved in `cause`; no rejection is left unhandled.
- A synchronous `getItem`, restoration, migration, or migration write-back failure inside the atom creator fails closed synchronously: legacy storage stays unchanged and no atom is returned.
- During a local `set()`, an encode failure or a synchronous throw from the immediately invoked `setItem` also fails closed synchronously: memory stays unchanged and watchers are not notified.
- `rehydrate()` and `clear()` always return lifecycle Promises. Even when their internal `getItem` or `removeItem` throws synchronously, the returned Promise rejects and `onError` records the failure.
- A `setItem` placed behind existing asynchronous work may throw synchronously when the queue invokes it or return a rejected Promise. That queued deferred write error leaves the memory value already committed by the original `set()` intact; `onError` and the next `flush()` expose it, and later writes continue.
- An `Object.is` no-op update does not write to storage.
- If a watcher throws during the commit phase, storage and memory have already been updated and are not rolled back.
- If decoding a stored value throws, the failure is wrapped with the key and the original error is preserved in `cause`; the plugin does not silently fall back to the initial value.
- If reading the default `globalThis.localStorage` throws, the error advises passing explicit storage and preserves the original error in `cause`.

## Public types

- `MaybePromise<Value>`
- `PersistStorage`
- `PersistOptions`
- `PersistControls`
- `PersistCodec`
- `PersistMigration`

`PersistControls` provides `ready`, `flush`, `rehydrate`, and `clear`. All storage methods use `MaybePromise`, so both synchronous implementations and implementations returning `PromiseLike` values are accepted.

## License

`@zhuangtai-js/persist` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
