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

`.use()` 从左到右建立 creator 层级，后安装的插件位于更外层。因此在这个例子中，`sync` 是最外层，`persist` 位于它的内层。本地调用 `theme.set("dark")` 时，更新先进入 `sync` 的 wrapper，再通过 `context.next()` 向内传给 `persist`，最后到达底层 atom。

层次顺序也决定公共 TypeScript 形态：最外层插件声明的 `kind` 决定最终 creator 和 atom 暴露的类型。例如 `createAtom().use(immer).use(freeze)` 最终采用 `freeze` 的 default kind，因此不会错误暴露 Immer recipe setter。

同一个 plugin ID 不能重复安装；对同一个 creator 重复 `.use()` 会同步抛出 `TypeError`，避免选项和 wrapper 语义产生歧义。

收到 `sync` 的远端广播时，情况会不一样。广播会写入 `sync` 创建时捕获的内层 state：它会经过安装在 `sync` 之前、位于其内层的插件（本例中的 `persist`），但会绕过 `sync` 自己的广播 `set` 以及之后安装在它外层的 wrapper。这就是为什么插件顺序和职责边界都很重要。

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

## 组合时记住这些边界

- 插件只影响它们被安装的 creator。
- `.use()` 越靠后，wrapper 层级越靠外；本地 `set()` 从外向内传递。
- 最外层插件的 `kind` 决定最终公共类型。
- plugin ID 必须唯一，重复安装会同步失败。
- `sync` 的远端更新写入其内层 state；它会经过内层插件，但会绕过 `sync` 自己和外层插件的 `set` wrapper。

这也是为什么 `createAtom()` 值得单独拿出来。它让你先定好这条状态线要经过哪些能力，再把 atom 实例创建出来。

## 当前支持范围

当前 `freeze@0.1.x`、`immer@0.1.x`、`persist@0.2.x`、`react@0.1.x` 和 `sync@0.1.x` 都支持 `@zhuangtai-js/core@^0.4.0`。React adapter 另外支持 React `>=18 <20`。这些范围是已经验证的兼容声明，不代表对未知未来主版本的承诺。

## 下一步

- 阅读 [Core 概念](/guides/core-concepts/) ，先把 `set`、`watch` 和 `computed` 的语义吃透。
- 阅读 [Persist 参考](/reference/persist/) ，查看 storage 和 codec 的细节。
