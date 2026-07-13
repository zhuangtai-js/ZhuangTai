---
title: Solid 参考
description: "@zhuangtai-js/solid 的 accessor、owner 生命周期、引用语义与服务端边界。"
---

`@zhuangtai-js/solid` 把 Core atom 与 computed 转为 Solid accessor。客户端订阅绑定到当前 owner；服务端标准 SSR 只返回 snapshot。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

peer 范围是 `@zhuangtai-js/core ^0.5.0` 与 Solid `>=1.5 <2`。

## `createAtomValue(source)`

把 `ReadableAtom<Value>` 转为 `Accessor<Value>`。客户端订阅 Core；服务端返回一次 snapshot。

```ts
import { createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const owned = createRoot((dispose) => ({
  count: createAtomValue(countAtom),
  dispose,
}));

countAtom.set(1);
console.log(owned.count()); // 1
owned.dispose();
```

客户端读取 API 必须位于组件或 `createRoot` 中。客户端没有 owner 时，函数会在读取或订阅前同步抛错；服务端标准 `renderToString` 回调不要求 owner。

## `createSetAtom(source)`

返回一个直接调用 Core `set` 的 setter，不读取也不订阅，因此不要求 owner。

```ts
import { createSetAtom } from "@zhuangtai-js/solid";

const setCount = createSetAtom(countAtom);
setCount(1);
setCount((value) => value + 1);
```

## `createAtomSignal(source)`

返回 `[Accessor<Value>, setter]`：

```ts
import { createAtomSignal } from "@zhuangtai-js/solid";

const [count, setCount] = createAtomSignal(countAtom);
```

它等价于同时调用 `createAtomValue` 与 `createSetAtom`。客户端必须位于 owner 中；服务端标准 SSR 不要求手工创建 owner。

## Owner 与引用语义

客户端组件或 root owner 中，adapter 通过 `onCleanup` 注册 Core stopper；owner dispose 时，订阅随之停止。手动客户端 `createRoot` 必须保存并调用 `dispose`。`renderToString` 的服务端路径通过 `solid-js/web` 的公开 `isServer` 信号先读取 snapshot，不检查 owner、不建立 Core watcher，也不依赖 SSR cleanup。

内部 signal 使用 `{ equals: false }`，因此 Solid 不会再增加第二层相等判断；只有 Core `Object.is` 决定是否发送通知。adapter 用函数包装写入 signal，函数值会作为值保存而不是被当作 Solid updater 执行。对象、数组和函数保持原始引用，不复制也不代理。

## 语义

- Core `watch` 的初始同步通知用于关闭读取与订阅之间的窗口；若值未变化，adapter 跳过重复 signal 写入。
- 重复 `NaN` 不通知，`0` 与 `-0` 不相等。
- 对象和数组按引用判断，应使用 immutable（不可变）更新。
- adapter 不添加调度、批处理、延迟或事务，也不替换错误。

## SSR

Solid 的标准 `renderToString(() => createAtomValue(source)...)` 路径直接读取一次 snapshot，不要求回调中存在 owner，也不建立 Core watcher。Solid 1.5 不需要为兼容性手工包 `createRoot`。客户端组件/root owner 仍订阅 Core 并由 `onCleanup` 停止；手动客户端 root 必须显式 dispose。每个请求都应创建独立 atom；cleanup 不会自动隔离服务器 module-level 可变状态。

## 什么时候直接使用 Core

owner 之外的服务、SDK、服务器逻辑或命令如果不需要 Solid 依赖追踪，直接使用 Core。只写代码可以使用 `createSetAtom`，也可以直接调用 atom `set`。
