---
name: zhuangtai-plugins
description: Use this skill for createAtom().use(plugin), plugin ordering, and @zhuangtai-js/persist, @zhuangtai-js/freeze, @zhuangtai-js/immer, or @zhuangtai-js/sync, including versioned Persist migrations and synchronous failure semantics.
---

# ZhuàngTài Plugins

## 中文

插件安装在 `createAtom()` 创建的 creator 上，而不是 atom 实例上。

### 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
pnpm add @zhuangtai-js/core @zhuangtai-js/immer
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

### 组合

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(persist).use(sync);
const theme = atom("light", {
  persist: { key: "theme" },
  sync: { key: "theme" },
});
```

- `.use()` 从左到右建立层，后安装的 plugin 位于外层。
- plugin ID 必须唯一；同一 creator 重复安装同 ID 会同步抛出 `TypeError`。
- 本地 `set` 从外层流向内层。需要 remote sync 更新也写入 storage 时使用 `use(persist).use(sync)`。
- 需要 Immer recipe 与开发期 freeze 时使用 `use(freeze).use(immer)`。

### Persist

`@zhuangtai-js/persist` 使用同步 Web Storage 风格接口。更新顺序是 encode → storage write → 内存提交 → 同步 watcher。encode 或写入失败时，内存状态不变；`Object.is` no-op 不写 storage。

```ts
import { definePersistMigration, persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
const settings = atom(
  { theme: "light", density: "comfortable" },
  {
    persist: {
      key: "settings",
      version: 1,
      migrations: {
        0: definePersistMigration((value) => {
          if (
            typeof value !== "object" ||
            value === null ||
            !("theme" in value) ||
            typeof value.theme !== "string"
          ) {
            throw new TypeError("Invalid legacy settings value.");
          }

          return { ...value, density: "comfortable" };
        }),
      },
    },
  },
);
```

- `version` 必须是正安全整数；省略时保持原始未版本化格式。
- 没有 marker 的旧数据按 version 0 处理。
- `migrations[n]` 同步迁移版本 `n` 到 `n + 1`，所有中间步骤都必须存在。
- migration 的输入来自 storage，始终是 `unknown`；先在回调中解析或收窄后再访问旧结构。`definePersistMigration<Value>` 的回调参数仍是 `unknown`，`Value` 只约束返回值；helper 不做运行时校验。
- 迁移成功后先 encode 并 write-back 当前版本记录，再 decode 最终值并创建 atom。
- current-version 记录直接 decode，不迁移也不重写。
- future version、缺失步骤、畸形 marked record 会同步抛错。
- migration、codec 与版本化写入错误包含 key/版本上下文，并在 `cause` 保留原错误。
- migration 或 write-back 失败时不创建新 atom；普通更新失败时内存状态和 watcher 保持不变。
- 默认 JSON codec 拒绝 `NaN`、`±Infinity` 与无效 `Date`。异步 storage 不受支持。

### Freeze

`freeze` 在启用时深冻结初始值与后续更新值。默认在非 production 启用，可用 `freeze.enabled` 覆盖。它主要保护普通对象与数组，不会阻止 `Map`、`Set` 或 `Date` 的内部内容修改。

### Immer

`immer` 把 `set(fn)` 解释为 Immer recipe，直接值仍绕过 Immer。recipe 返回 `undefined` 表示没有替换值；需要生成 `undefined` 时使用 Immer 的 `nothing`。

### Sync

`sync` 通过 `BroadcastChannel` 同步同源上下文。本地更新先 encode、提交内存，再广播；远端更新写入内部状态而不回声广播。SSR 或没有 `BroadcastChannel` 时退化为普通 atom。远端 decode 失败不会改状态。

## English

Plugins are installed on a creator made with `createAtom()`, not on atom instances.

### Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
pnpm add @zhuangtai-js/core @zhuangtai-js/immer
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

### Composition

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(persist).use(sync);
const theme = atom("light", {
  persist: { key: "theme" },
  sync: { key: "theme" },
});
```

- `.use()` builds layers from left to right, with later plugins on the outside.
- Plugin IDs must be unique. Installing the same ID twice on one creator throws a synchronous `TypeError`.
- Local `set` flows from outer layers inward. Use `use(persist).use(sync)` when remote sync updates must also write storage.
- Use `use(freeze).use(immer)` when Immer recipes and development freeze are both needed.

### Persist

`@zhuangtai-js/persist` uses a synchronous Web Storage-style interface. Update order is encode → storage write → memory commit → synchronous watchers. Encode or write failure leaves memory unchanged, and an `Object.is` no-op does not write storage.

```ts
import { definePersistMigration, persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
const settings = atom(
  { theme: "light", density: "comfortable" },
  {
    persist: {
      key: "settings",
      version: 1,
      migrations: {
        0: definePersistMigration((value) => {
          if (
            typeof value !== "object" ||
            value === null ||
            !("theme" in value) ||
            typeof value.theme !== "string"
          ) {
            throw new TypeError("Invalid legacy settings value.");
          }

          return { ...value, density: "comfortable" };
        }),
      },
    },
  },
);
```

- `version` must be a positive safe integer. Omitting it preserves the raw unversioned format.
- Legacy data without a marker is treated as version 0.
- `migrations[n]` synchronously migrates version `n` to `n + 1`, and every intermediate step must exist.
- Migration input comes from storage and is always `unknown`; parse or narrow it in the callback before reading the legacy shape. The `definePersistMigration<Value>` callback input remains `unknown`, `Value` only constrains the return value, and the helper performs no runtime validation.
- After migration, Persist encodes and performs current-version write-back before decoding the final value and creating the atom.
- A current-version record decodes directly without migration or rewrite.
- A future version, missing step, or malformed marked record throws synchronously.
- Migration, codec, and versioned-write errors include key/version context and preserve the original error as `cause`.
- Migration or write-back failure does not create a new atom. Normal update failure leaves memory and watchers unchanged.
- The default JSON codec rejects `NaN`, `±Infinity`, and invalid `Date` values. Async storage is unsupported.

### Freeze

`freeze` deep-freezes initial and updated values when enabled. It defaults to enabled outside production and can be overridden with `freeze.enabled`. It mainly protects plain objects and arrays; it does not prevent internal `Map`, `Set`, or `Date` mutation.

### Immer

`immer` interprets `set(fn)` as an Immer recipe, while concrete values bypass Immer. A recipe returning `undefined` means no replacement; use Immer's `nothing` token to produce `undefined`.

### Sync

`sync` uses `BroadcastChannel` across same-origin contexts. Local updates encode, commit memory, then broadcast. Remote updates write inner state without echo broadcasting. Under SSR or without `BroadcastChannel`, it degrades to a plain atom. Remote decode failure leaves state unchanged.
