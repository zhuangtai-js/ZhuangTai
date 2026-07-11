---
title: Sync 参考
description: "@zhuangtai-js/sync 的 BroadcastChannel 同步、codec 和跨上下文语义。"
---

`@zhuangtai-js/sync` 为用 `createAtom()` 创建的 atom creator 提供跨上下文同步。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

这里把 `@zhuangtai-js/core` 一起安装，因为它是 `@zhuangtai-js/sync` 的 peer dependency。

## 安装插件

把 `sync` 安装到一个 atom creator 上。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);
```

默认导出的 `atom()` 不会被扩展；只有通过这个 creator 创建的 atom 才接受 `sync` 选项。

## 同步一个 atom

传入 `sync.key` 后，插件会用 `BroadcastChannel` 在同源上下文之间同步状态。

```ts
const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.set("dark");
```

## 配置 channel

同步默认使用按 `key` 命名的 `BroadcastChannel`。自定义 `channel` 需要实现 `postMessage` 和 `addEventListener("message", ...)`，与 `BroadcastChannel` 的同名方法保持一致。

```ts
const channel = new BroadcastChannel("count");

const count = atom(0, {
  sync: {
    key: "count",
    channel,
  },
});
```

如果省略 `channel`，插件会使用 `new BroadcastChannel(key)`。在 SSR 或不支持 `BroadcastChannel` 的运行时中，atom 会静默降级为普通 atom，不进行同步，也不会报错。

## 配置 codec

默认 codec 使用 `JSON.stringify` 和 `JSON.parse`，并在 encode 前拒绝 `NaN`、`±Infinity` 和无效 `Date`（它们在 JSON 里会静默变成 `null`）。顶层 `undefined`、函数和 symbol 也会在 encode 时抛错，而不是发送到 channel。

```ts
const count = atom(0, {
  sync: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

## 语义

- 省略 `sync` 选项时，atom 保持不变。
- 本地更新会先 encode，成功后再同步提交内存并广播已编码载荷；encode 失败时内存不变、不广播。
- 收到远端广播时，会 decode 后直接写入底层状态，不会再次广播，从而避免回环。
- 远端 decode 失败会被隔离：不更新本地状态，不把异常抛出事件回调，并 `console.error` 诊断信息。
- `Object.is` 判定为无变化的更新不会广播。
- 收到的广播直接写入底层状态，因此会跳过其他包裹在 `sync` 之上的插件的 `set` 逻辑。推荐 `createAtom().use(persist).use(sync)`。
- SSR 或没有 `BroadcastChannel` 的运行时会静默降级为普通 atom。
- 默认创建的 `BroadcastChannel` 在 Node 等支持 `unref` 的运行时中不会阻止进程退出，进程存活期间同步照常工作。显式传入的 `channel` 由调用方自行管理。
- `BroadcastChannel` 只在同源上下文间工作，不跨设备，不做持久化。需要持久化时请搭配 `@zhuangtai-js/persist`。
- 不支持异步 channel。

## 类型

`@zhuangtai-js/sync` 导出这些 public types：

```ts
export type SyncCodec = {
  readonly encode: (value: unknown) => string;
  readonly decode: <Value>(rawValue: string, initialValue: Value) => Value;
};

export type SyncMessageEvent = {
  readonly data: string;
};

export type SyncChannel = {
  readonly postMessage: (message: string) => void;
  readonly addEventListener: (type: "message", listener: (event: SyncMessageEvent) => void) => void;
};

export type SyncOptions = {
  readonly key: string;
  readonly channel?: SyncChannel;
  readonly codec?: SyncCodec;
};
```

`SyncOptions.key` 是必填项。`channel` 和 `codec` 都是可选项。
