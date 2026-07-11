---
title: Persist 参考
description: "@zhuangtai-js/persist 的持久化插件、storage 和 codec 选项。"
---

`@zhuangtai-js/persist` 为 `createAtom()` 创建的 atom creator 添加同步持久化能力。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## 安装插件

把 `persist` 安装到一个 atom creator 上。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

默认导出的 `atom()` 不会被扩展；只有通过这个 creator 创建的 atom 才接受 `persist` 选项。

## 持久化一个 atom

传入 `persist.key` 后，插件会在创建 atom 前读取存储值，并在后续更新后写入存储。

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

如果 `storage.getItem(key)` 返回 `null`，会使用传给 atom 的初始值。

## 配置 storage

默认使用 `globalThis.localStorage`。也可以显式传入同步 Web Storage 风格的 `storage`。

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

自定义 `storage` 需要实现 `getItem`、`setItem` 和 `removeItem`，与 `localStorage` 的同步方法保持一致。当前写入流程只会读取和写入值；`removeItem` 是 storage 接口的一部分，用于保持 Web Storage 兼容。

如果没有传入 `storage`，并且当前环境没有 `globalThis.localStorage`，atom 创建会抛错。

## 配置 codec

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`，并在 encode 前拒绝 `NaN`、`±Infinity` 和无效 `Date`（它们在 JSON 里会静默变成 `null`）。顶层 `undefined`、函数和 symbol 也会在 encode 时抛错。需要特殊值时请传入自定义 codec。

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

顶层 `undefined`、函数和 symbol 会在 encode 时抛错，而不是传给 storage。对象字段中的 `undefined` 仍遵循 JSON 语义（键会被省略）。

## 错误语义

更新会先持久化：先用 codec 编码并写入 storage，成功后才提交内存状态并同步通知 watcher。

- 如果 encode 或 storage 写入失败，内存状态保持不变，并抛出错误。
- watcher 在提交阶段抛错时，值已经持久化且内存状态已更新（仅通知失败，不回滚）。
- `Object.is` 判定为无变化的更新不会写入 storage。
- 恢复已存储值时，若 codec decode 抛错，会包装成带出错 key 的错误（原错误保留在 `cause`），而不会静默回退到初始值。
- 省略 `storage` 且读取 `globalThis.localStorage` 抛错（如 SecurityError）时，会抛出提示传入显式 storage 的清晰错误（原错误保留在 `cause`）。

## 类型

`@zhuangtai-js/persist` 导出这些 public types：

- `PersistOptions`
- `PersistStorage`
- `PersistCodec`

`PersistStorage` 是同步接口。不支持异步 storage。
