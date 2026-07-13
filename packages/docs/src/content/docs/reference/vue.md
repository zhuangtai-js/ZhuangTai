---
title: Vue 参考
description: "@zhuangtai-js/vue 的 computed ref、effect scope、组件生命周期与 SSR 行为。"
---

`@zhuangtai-js/vue` 把 Core atom 和 computed 暴露为只读 Vue `ComputedRef`，同时保留 Core 的同步更新与引用语义。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

peer 范围是 `@zhuangtai-js/core ^0.5.0` 与 Vue `>=3.2 <4`。

## `useAtomValue(source)`

在客户端订阅 `ReadableAtom<Value>` 并返回只读 `ComputedRef<Value>`；Vue SSR 路径只读取 snapshot，不建立 Core 订阅。

```ts
import { effectScope } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const scope = effectScope();

scope.run(() => {
  const count = useAtomValue(countAtom);
  countAtom.set(1);
  console.log(count.value); // 1
});

scope.stop();
```

读取 API 必须在组件 `setup()`、`<script setup>`、`effectScope().run()` 或其他活动 effect scope 中调用。没有活动 scope 时，函数会在读取或订阅前同步抛错。

## `useSetAtom(source)`

返回一个直接调用 Core `set` 的 setter，不读取也不订阅，因此不要求活动 effect scope。

```ts
import { useSetAtom } from "@zhuangtai-js/vue";

const setCount = useSetAtom(countAtom);
setCount(1);
setCount((value) => value + 1);
```

## `useAtom(source)`

返回 `[ComputedRef<Value>, setter]`：

```ts
import { useAtom } from "@zhuangtai-js/vue";

const [count, setCount] = useAtom(countAtom);
```

它等价于同时调用 `useAtomValue` 与 `useSetAtom`，所以必须位于活动 effect scope。

## 引用与生命周期

adapter 使用 `shallowRef` 保存 snapshot，再返回只读 computed。对象和数组保持 Core 中的同一个引用，不会变成深层 Vue proxy。Core `watch` 的初始同步通知关闭读取与订阅之间的窗口，后续通知同步更新 `.value`。

stopper 通过 `onScopeDispose` 注册。组件卸载或 effect scope 停止时，Core 订阅自动释放。手动创建的 `effectScope` 仍需由调用方执行 `scope.stop()`。

## 语义

- 变化判断完全由 Core `Object.is` 决定；重复 `NaN` 不通知，`0` 与 `-0` 不相等。
- 对象和数组按引用判断，应使用 immutable（不可变）更新。
- adapter 不添加调度、批处理、延迟或事务，也不替换 Core 与 watcher 错误。
- `.value` 在 Core 通知期间已同步更新；Vue 组件 DOM 仍遵循 Vue 自己的渲染调度。

## SSR

在 `createSSRApp` 组件的 `setup()` 中调用 `useAtomValue` 时，`renderToString` 路径只读取 `atom.get()` snapshot，不安装 Core watcher，也不建立订阅。只有客户端活动 effect scope 中的读取 API 才会订阅 Core，并由 `onScopeDispose` 注册的 scope cleanup 自动释放；不需要为了组件 SSR 额外包一层手动 `effectScope`。

```ts
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(1); // 在真实应用中为每个请求创建。
const app = createSSRApp({
  setup() {
    const count = useAtomValue(countAtom);
    return () => h("span", String(count.value));
  },
});

await renderToString(app); // SSR 只读取 snapshot，不建立 Core 订阅。
```

SSR 不建立订阅；客户端 cleanup 只解决订阅生命周期，不解决状态隔离。用户或请求相关 atom 必须按每个请求创建，不能共享服务器 module-level 可变实例。

## 什么时候直接使用 Core

在 Vue effect scope 之外的数据层、服务器逻辑或 SDK 中，如果不需要 `ComputedRef`，直接使用 Core。setter-only 场景也可以使用 `useSetAtom`，或直接调用 atom `set`。
