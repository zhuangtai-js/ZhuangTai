---
title: Persist 参考
description: "@zhuangtai-js/persist 的同步 storage、codec、版本迁移与失败语义。"
---

`@zhuangtai-js/persist` 为 `createAtom()` 创建的 atom creator 添加同步持久化。未配置 `version` 时保持原始存储格式；配置版本后才启用带标记记录、逐步迁移与写回。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 安装插件

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

默认导出的 Core `atom()` 不接受插件选项。只有这个 creator 创建的 atom 才能传入 `persist`。

## 不带版本的持久化

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

// 先编码并写入 storage，成功后才提交内存值。
theme.set("dark");
```

如果 `storage.getItem(key)` 返回 `null`，使用传给 atom 的初始值。省略 `version` 时，codec 生成的字符串会原样存储，已有未版本化数据的字节与行为不变。

## 版本化持久化

`version` 必须是正安全整数。开启版本后，旧的无标记数据按 version 0 处理，`migrations[n]` 负责从版本 `n` 迁移到 `n + 1`。

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = {
  readonly theme: "light" | "dark";
};

type SettingsV1 = SettingsV0 & {
  readonly density: "comfortable" | "compact";
};

type Settings = SettingsV1 & {
  readonly locale: string;
};

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    (value.theme === "light" || value.theme === "dark")
  );
}

function isSettingsV1(value: unknown): value is SettingsV1 {
  return (
    isSettingsV0(value) &&
    "density" in value &&
    (value.density === "comfortable" || value.density === "compact")
  );
}

const settings = atom<Settings>(
  { theme: "light", density: "comfortable", locale: "zh-CN" },
  {
    persist: {
      key: "settings",
      version: 2,
      migrations: {
        0: definePersistMigration((value) => {
          if (!isSettingsV0(value)) {
            throw new TypeError("Invalid SettingsV0 stored value.");
          }

          return { ...value, density: "comfortable" };
        }),
        1: definePersistMigration((value) => {
          if (!isSettingsV1(value)) {
            throw new TypeError("Invalid SettingsV1 stored value.");
          }

          return { ...value, locale: "zh-CN" };
        }),
      },
    },
  },
);
```

迁移在 atom 创建期间同步、按版本顺序逐步运行。不能跳过中间版本：从 version 0 恢复到 version 2 时，必须同时提供 `migrations[0]` 与 `migrations[1]`。

## `definePersistMigration<Value>()`

`definePersistMigration<Value>(migration)` 是运行时 identity helper，但回调参数始终是来自 storage 的 `unknown`。可选的 `Value` 泛型只约束返回值，不能把某个窄输入类型伪装成安全的 migration 输入。它不会验证 storage 内容，也不会自动推导下一步类型。

```ts
const migrateTheme = definePersistMigration((value) => {
  if (!isSettingsV0(value)) {
    throw new TypeError("Invalid SettingsV0 stored value.");
  }

  return { ...value, density: "comfortable" as const };
});
```

从 storage 解码得到的数据仍是信任边界。如果内容可能被用户、旧版本或其他程序修改，请在 codec 或 migration 中执行运行时解析、校验与收窄。不要把 `(value: string) => unknown` 这类窄输入函数直接放进 `migrations`。

## 迁移最佳实践

- 只有序列化结构或解释方式改变时才增加 `version`。
- 保留仍可能出现在用户 storage 中的每一个连续迁移步骤。
- 每一步保持同步、确定且无副作用；返回新对象或数组，不要原地修改输入。
- 在 `definePersistMigration` 回调中把输入当作 `unknown`，先解析或收窄成该步骤的旧结构。
- 不要在迁移中读取浏览器 UI、网络或请求外共享状态。
- 自定义 codec 在迁移旧数据时应能在没有最终 `initialValue` 作为 decode target 的情况下工作。

## 恢复与写回顺序

版本化恢复按以下顺序执行：

1. 解析带标记记录；没有标记的原始字符串视为 version 0 payload。
2. 如果记录已经是当前版本，直接用 codec decode，不运行 migration，也不重写 storage。
3. 如果记录较旧，收集每个连续步骤，decode 旧 payload，并按顺序运行 migrations。
4. 用 codec encode 迁移结果，先把当前版本记录写回 storage。
5. 只有写回成功后，才把新 payload decode 成最终 `Value` 并创建 atom。

因此 migration 写回失败时，不会创建一个只存在于内存、却没有成功持久化的新版本状态。

## 存储记录格式

版本化记录是一个精确 JSON envelope：

```json
{ "__zhuangtai_persist__": true, "version": 2, "payload": "{\"theme\":\"dark\"}" }
```

自定义 codec 只控制 `payload` 字符串。envelope 必须只有 `__zhuangtai_persist__`、`version` 与 `payload` 三个字段；marker 必须是 `true`，版本必须是正安全整数，payload 必须是字符串。

## 配置 storage

默认使用 `globalThis.localStorage`。也可以传入同步 Web Storage 风格对象：

```ts
const values = new Map<string, string>();

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
};
```

`PersistStorage` 必须实现同步 `getItem`、`setItem`、`removeItem`。不支持异步 storage。省略 `storage` 且读取 `globalThis.localStorage` 抛错时，插件会抛出提示显式传入 storage 的错误，并把原错误保留为 `cause`。

## 配置 codec

默认 codec 使用 `JSON.stringify` / `JSON.parse`，并在 encode 前拒绝非有限数字与无效 `Date`，避免它们被 JSON 静默转换为 `null`。顶层 `undefined`、函数或 symbol 也不能编码。

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

版本化模式仍使用同一个 codec，但只把 codec 输出放进 envelope 的 `payload`。

## 失败语义

以下情况都会同步抛错，不会静默回退：

- 配置的 `version` 不是正安全整数。
- storage 中是 future version，配置版本比记录版本旧。
- 从旧版本到目标版本缺少任何 migration 步骤。
- 带 marker 的记录不是精确 envelope。
- migration、codec encode/decode 或版本化 storage 写入失败。

migration、codec 与版本化写入错误会包含 key 和相关版本；原错误保留在 `cause`。

创建期间的 migration 或写回失败时，旧 storage 保持不变，atom 不会创建，调用方初始对象也不会因最终 decode 而被修改。普通更新期间如果 encode 或 storage 写入失败，内存状态保持不变，watcher 不会收到通知，错误继续抛出。

更新成功时顺序仍是“encode → storage 写入 → 内存提交 → 同步 watcher”。如果 watcher 在提交后抛错，storage 与内存已经更新，不会回滚。`Object.is` 判定为无变化的更新不会写 storage。

## Public types

- `PersistOptions`
- `PersistStorage`
- `PersistCodec`
- `PersistMigration`

`PersistMigration` 的边界输入与返回值在运行时都是未知数据，公开输入类型是 `(value: unknown) => unknown`。`definePersistMigration` 不改变这个输入边界；它只提供 identity 包装，并可用 `Value` 泛型约束返回值。
