---
title: Persist 参考
description: "@zhuangtai-js/persist 的同步与异步 storage、hydration、controller、codec、版本迁移与错误语义。"
---

`@zhuangtai-js/persist` 为 `createAtom()` 创建的 atom creator 添加持久化。它支持同步 storage，也支持每次返回普通值或 `PromiseLike` 的通用异步 storage；Core 的 `set` 和 `watch` 仍保持同步。

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

## 同步与异步 storage

`PersistStorage` 是结构化契约，不绑定某个 storage 库或运行时。`getItem`、`setItem` 和 `removeItem` 每次调用都可以返回普通值或 `PromiseLike` 值：

```ts
import type { PersistStorage } from "@zhuangtai-js/persist";

const values = new Map<string, string>();

const storage: PersistStorage = {
  getItem: (key) => Promise.resolve(values.get(key) ?? null),
  setItem: (key, value) =>
    Promise.resolve().then(() => {
      values.set(key, value);
    }),
  removeItem: (key) =>
    Promise.resolve().then(() => {
      values.delete(key);
    }),
};
```

插件按每次调用的返回值检测 thenable，因此同一个 storage 可以混合同步和异步方法。

| 场景                                   | 行为                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `getItem` 返回普通值                   | 在 atom creator 返回前完成恢复；更新保持“encode → 写入 → 内存提交 → 同步 watcher”顺序。       |
| `getItem` 返回 thenable                | 立即用 `initialValue` 创建 atom，再异步 hydration；`persist.ready(atom)` 等待当前 hydration。 |
| `setItem` / `removeItem` 返回 thenable | `set` 和 `watch` 仍同步；写入按调用顺序排队，失败通过 `onError` 和 `persist.flush()` 观察。   |

异步 `set()` 不会等待 Promise。它先 encode 新值，再加入 storage 写入队列，然后同步提交内存值并通知 watcher。编码失败，或 `setItem` 在这次原始 `set()` 同步调用内抛错，都会同步 fail-closed：内存值不提交，watcher 不通知。如果写入排在已有异步工作之后，`setItem` 直到队列执行时才抛错；相对于原始 `set()`，这是 queued deferred failure，本地内存提交会保留，并由 `onError` 与 `flush()` 报告。

- 如果用内存回退包装 storage，必须按每次调用保留同步值或 `PromiseLike` 返回形状；异步 `getItem` 在完成后再校验和缓存，异步 `setItem` / `removeItem` 要观察 rejection 后再切换回退，不能直接丢弃 Promise。

## 生命周期 controller

`persist` 导出带有生命周期 controller 方法的插件对象：

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const state = createAtom().use(persist)(0, {
  persist: { key: "count" },
});

await persist.ready(state);
await persist.flush(state);
await persist.rehydrate(state);
await persist.clear(state);
```

- `ready(atom)` 等待最新 hydration generation；读取、迁移或 migration write-back 失败时 reject。
- `flush(atom)` 等待 hydration、controller 操作和排队写入；它 reject 第一条保留失败，然后清空这批失败。
- `rehydrate(atom)` 返回 lifecycle Promise 并开始新一代读取；旧一代的迟到结果不会覆盖新结果。内部 `getItem` 即使同步抛错，也会表现为这个 Promise reject。
- hydration 期间发生本地更新时，本地值获胜；读取完成后会写入最新本地值。
- `clear(atom)` 返回 lifecycle Promise，等待 hydration 和排队写入后再调用 `removeItem`；内部 `removeItem` 即使同步抛错，也会表现为这个 Promise reject。它不会重置内存中的 atom 值。
- 对没有由本插件创建的 atom 使用 controller 方法会抛出 `TypeError`。

异步写入按本地 `set()` 的逻辑顺序串行执行。某次写入 reject 不会阻止后续写入；失败会保留到下一次 `flush()`，每个失败操作都可以通过对应 atom 的 `onError` 报告一次。

## SSR 与 hydration

默认 storage 是 `globalThis.localStorage`。SSR 没有可用的 `localStorage` 时，请传入请求或客户端明确拥有的 storage，或只在客户端创建持久化 atom。

异步 storage 会先使用 `initialValue`，直到 hydration 完成。需要稳定 SSR 输出时，让服务端和客户端先使用相同的初始状态，再在客户端根据 `persist.ready(atom)` 显示恢复内容；不要在服务端渲染阶段直接读取浏览器专属 storage。

## 不带版本的持久化

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

如果 `storage.getItem(key)` 返回 `null`，使用传给 atom 的初始值。省略 `version` 时，codec 生成的字符串会原样存储，已有未版本化数据的字节与行为不变。

同步 storage 的更新顺序是 encode → storage 写入 → 内存提交 → 同步 watcher。`Object.is` 判定为无变化的更新不会写 storage；写入失败时内存状态保持不变，watcher 不会收到通知。

## 版本化持久化与迁移

`version` 必须是正安全整数。开启版本后，旧的无标记数据按 version 0 处理，`migrations[n]` 负责从版本 `n` 迁移到 `n + 1`。

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = { readonly theme: "light" | "dark" };
type Settings = SettingsV0 & { readonly density: "comfortable" | "compact" };

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    (value.theme === "light" || value.theme === "dark")
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

迁移回调始终同步、确定且无副作用，并按版本逐步运行；异步 storage 只让读取和写回异步。不能跳过中间版本：从 version 0 恢复到 version 2 时，必须同时提供 `migrations[0]` 与 `migrations[1]`。

异步 hydration 中，插件会先完成 migration write-back，再提交迁移后的内存值并 resolve `ready`。如果本地更新在 hydration 或迁移期间获胜，过期迁移结果不会应用或写回；插件会写入最新本地值。当前版本记录直接恢复，不迁移也不重写。

`PersistMigration` 的输入来自 storage 边界，始终是 `unknown`。请在每一步先解析或收窄旧结构；不要把 `(value: string) => unknown` 这类窄输入函数直接放进 `migrations`。`definePersistMigration<Value>` 是 identity helper：它不改变 `unknown` 输入边界，只可用 `Value` 泛型约束返回值。

## 迁移最佳实践

- 只有序列化结构或解释方式改变时才增加 `version`。
- 保留仍可能出现在用户 storage 中的每一个连续迁移步骤。
- 每一步保持同步、确定且无副作用；返回新对象或数组，不要原地修改输入。
- 在 `definePersistMigration` 回调中把输入当作 `unknown`，先解析或收窄成该步骤的旧结构。
- 不要在迁移中读取 UI、网络或请求外共享状态。
- 自定义 codec 在迁移旧数据时应能在没有最终 `initialValue` 作为 decode target 的情况下工作。

## 恢复与写回顺序

版本化恢复按以下顺序执行：

1. 解析带标记记录；没有标记的原始字符串视为 version 0 payload。
2. 如果记录已经是当前版本，直接用 codec decode，不运行 migration，也不重写 storage。
3. 如果记录较旧，收集每个连续步骤，decode 旧 payload，并按顺序运行 migrations。
4. 用 codec encode 迁移结果，先把当前版本记录写回 storage。
5. 只有写回成功后，才把新 payload decode 成最终 `Value` 并创建或更新 atom。

因此 migration 写回失败时，不会提交一个只存在于内存、却没有成功持久化的新版本状态；异步场景中 `ready` 会 reject，错误会到达 `onError` 和 `flush`。

## 存储记录格式

版本化记录是一个精确 JSON envelope：

```json
{ "__zhuangtai_persist__": true, "version": 2, "payload": "{\"theme\":\"dark\"}" }
```

自定义 codec 只控制 `payload` 字符串。envelope 必须只有 `__zhuangtai_persist__`、`version` 与 `payload` 三个字段；marker 必须是 `true`，版本必须是正安全整数，payload 必须是字符串。

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

## 失败语义

失败发生在哪个调用边界，决定它是同步抛错还是在对应 Promise 中 reject；插件不会静默回退：

- 配置的 `version` 不是正安全整数。
- storage 中是 future version，配置版本比记录版本旧。
- 从旧版本到目标版本缺少任何 migration 步骤。
- 带 marker 的记录不是精确 envelope。
- migration、codec encode/decode 或 storage 读取、写入、删除失败。

错误会包含 package、操作、key 和相关版本上下文；原错误保留在 `cause`。`onError` 按失败的异步 hydration、异步或排队写入、migration write-back、`rehydrate` 或 `clear` 操作调用一次；creator 或本地 `set()` 原始同步调用内的抛错会直接传播，不经过 `onError`。`flush` 等待所有排队工作，暴露第一条保留失败后清空这批失败。

atom creator 调用中的同步 `getItem`、恢复、migration 或 migration write-back 失败会同步 fail-closed：旧 storage 保持不变，也不会返回 atom。本地 `set()` 中，encode 或立即调用的 `setItem` 同步抛错时，`set()` 同步 fail-closed，内存状态保持不变，watcher 不会收到通知。

`rehydrate()` 和 `clear()` 始终是 lifecycle Promise；它们内部的 `getItem` 或 `removeItem` 即使同步抛错，也会让返回的 Promise reject，并通过 `onError` 记录。若某次 `setItem` 排在已有异步工作之后，它在队列执行时发生的同步抛错或 Promise rejection 都属于 queued deferred write error：原始 `set()` 已同步提交的内存值会保留，错误由 `onError` 和下一次 `flush()` 暴露，后续写入仍会继续。

## Public types

- `MaybePromise<Value>`
- `PersistOptions`
- `PersistStorage`
- `PersistControls`
- `PersistCodec`
- `PersistMigration`

`PersistControls` 提供 `ready`、`flush`、`rehydrate` 和 `clear`。`PersistStorage` 的三个方法都使用 `MaybePromise`，因此可以接收同步实现，也可以接收返回 `PromiseLike` 的实现。
