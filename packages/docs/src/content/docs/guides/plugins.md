---
title: 插件与组合
description: 了解 createAtom()、.use(plugin) 和四个常用插件的组合方式与取舍。
---

ZhuàngTài 的核心故意很薄。真正让它适应不同场景的，是 creator 插件。你可以把插件看成一层层包在 atom creator 外面的行为壳，它们不会改变核心模型，只是给它加上额外能力。

## 为什么有 `createAtom()`

`atom()` 是默认导出，它保持未扩展状态，只接收初始值。想挂载插件时，先用 `createAtom()` 创建一个可扩展的 creator。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});
```

这个设计很直接。基础 `atom()` 适合纯 core 场景，`createAtom()` 适合你要加 `persist`、`sync`、`freeze` 或 `immer` 的场景。

## `.use(plugin)` 是怎么组合的

插件安装在 creator 上，不是安装在 atom 实例上。你可以把多个插件接起来：

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

上面的例子里，`theme.set("dark")` 先走正常的本地更新，再分别经过两个插件的行为。它们会按组合后的 creator 语义工作，而不是各管各的。

收到 `sync` 的远端广播时，情况会不一样。广播会直接写到底层状态，不会再绕回外层插件的 `set` 逻辑。这就是为什么插件顺序和职责边界都很重要。

## 一个现实例子，主题在多标签页里保持一致

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
  sync: {
    key: "theme",
  },
});

theme.set("dark");
```

这个组合适合主题、语言、面板折叠状态这类小而稳的偏好设置。`persist` 负责跨刷新保存，`sync` 负责跨标签页同步。两者放在一起，能得到一个很自然的体验：你改一次，别的标签页也会跟着变。

## 选择插件

| 插件      | 适合什么                     | 典型场景                         |
| --------- | ---------------------------- | -------------------------------- |
| `persist` | 把状态保存在同步 storage 里  | 主题、语言、草稿、用户偏好       |
| `freeze`  | 开发期抓住原地修改           | 调试复杂对象、数组状态           |
| `immer`   | 用“改草稿”的方式写不可变更新 | 深层嵌套对象、列表更新           |
| `sync`    | 在同源上下文间同步状态       | 多标签页主题、协作面板、窗口联动 |

如果你的痛点是“怕自己不小心改坏状态”，先选 `freeze`。如果你的痛点是“不可变更新写起来太啰嗦”，先选 `immer`。如果你要在刷新后还保留值，选 `persist`。如果你要让多个标签页保持一致，选 `sync`。

## 组合时记住两件事

第一，插件只影响它们被安装的 creator。第二，受 `sync` 广播驱动的更新会绕过外层插件的 `set` 逻辑，所以不要把依赖 `set` 拦截的行为，想当然地放在 `sync` 外面。

这也是为什么 `createAtom()` 值得单独拿出来。它让你先定好这条状态线要经过哪些能力，再把 atom 实例创建出来。

## 下一步

- 阅读 [Core 概念](/guides/core-concepts/) ，先把 `set`、`watch` 和 `computed` 的语义吃透。
- 阅读 [Persist 参考](/reference/persist/) ，查看 storage 和 codec 的细节。
