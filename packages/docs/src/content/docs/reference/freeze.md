---
title: Freeze 参考
description: "@zhuangtai-js/freeze 的开发期深冻结、enabled 选项和严格模式语义。"
---

`@zhuangtai-js/freeze` 为用 `createAtom()` 创建的 atom creator 提供开发期深冻结。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
```

这里把 `@zhuangtai-js/core` 一起安装，因为它是 `@zhuangtai-js/freeze` 的 peer dependency。

## 安装插件

把 `freeze` 安装到一个 atom creator 上。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);
```

默认导出的 `atom()` 不会被扩展；只有通过这个 creator 创建的 atom 才接受 `freeze` 选项。

## 保护一个 atom

传入 `freeze.enabled` 后，插件会在创建 atom 前对初始值执行深冻结，并在后续更新前冻结新值。

```ts
const user = atom(
  { name: "阿元", tags: ["a"] },
  {
    freeze: {
      enabled: true,
    },
  },
);

user.get().name = "改名"; // 开发期抛错：对象已被冻结。
user.set((prev) => ({ ...prev, name: "改名" }));
```

## 生产门控

默认情况下，插件只在非生产环境冻结。当 `NODE_ENV === "production"` 时，它会降级为无操作，不产生任何运行时开销。你也可以显式控制：

```ts
const state = atom(
  { count: 0 },
  {
    freeze: {
      enabled: false,
    },
  },
);
```

## 语义

- 初始值在 atom 创建前被深冻结，冻结的是同一个引用，不是副本。
- 每次 `set` 的值在提交给底层状态前被深冻结，updater 函数的返回值也会被冻结。
- 深冻结会递归冻结对象、数组和函数的自有属性，并对循环引用安全终止。
- 已冻结的值会被跳过，不重复处理。
- 关闭冻结时，atom 行为与未使用插件完全一致。
- 冻结基于 `Object.freeze`，只在严格模式下对写入抛错，非严格模式下写入会被静默忽略，这是 JavaScript 的固有行为。
- 已知边界：`Map` / `Set` / `Date` 等内容突变不是 own property 写入，容器冻结后仍可能通过方法改内容。freeze 面向 plain object / array 的开发期护栏。

## 类型

`@zhuangtai-js/freeze` 导出这些 public types：

```ts
export type FreezeOptions = {
  readonly enabled?: boolean;
};
```

`FreezeOptions.enabled` 是唯一配置项。省略它时，插件会根据 `NODE_ENV` 决定是否冻结。
