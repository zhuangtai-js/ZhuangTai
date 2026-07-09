---
title: Immer 参考
description: "@zhuangtai-js/immer 的草稿更新、recipe 语义和公开类型。"
---

`@zhuangtai-js/immer` 为用 `createAtom()` 创建的 atom creator 提供 Immer 更新能力。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/immer immer
```

这里把 `@zhuangtai-js/core` 和 `immer` 一起安装，因为它们分别是 `@zhuangtai-js/immer` 的 peer dependency 和运行时依赖。

## 安装插件

把 `immer` 安装到一个 atom creator 上。

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);
```

默认导出的 `atom()` 不会被扩展；只有通过这个 creator 创建的 atom 才接受 `immer` 相关的 recipe 更新。

## 使用草稿更新一个 atom

updater 函数会作为 Immer recipe 执行。你可以直接修改草稿，也可以直接返回新值。

```ts
const todos = atom([{ text: "a", done: false }]);

todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});

todos.set((draft) => draft.filter((todo) => !todo.done));
```

## 直接传值

如果你直接传入一个具体值，`immer` 不会介入，行为与 core 完全一致。

```ts
todos.set([{ text: "only", done: true }]);
```

## 语义

- `set(fn)` 里的 updater 函数会作为 Immer recipe 执行，既可以修改草稿并返回，也可以直接返回新值。
- 直接传入的具体值（`set(value)`）不经过 Immer，直接提交，行为与 core 一致。
- Immer 产出的都是全新的不可变引用，原有状态不会被就地修改。
- 通过 `set(value)` 提交给底层状态的始终是具体值，因此 core 不会把它再当成 updater 重复执行。
- `createAtom().use(immer)` 产出的 atom 类型与普通 atom 不同，它的 `set` 接受直接“修改草稿”的 recipe，且可以返回 `void`。
- Immer 的 recipe 返回 `undefined` 会被视为“未修改”；如需产出 `undefined`，请使用 Immer 的 `nothing` token。

## 类型

`@zhuangtai-js/immer` 导出这些 public types：

```ts
export type ImmerOptions = Record<never, never>;

export type ImmerRecipe<Value> = (draft: Draft<Value>) => Draft<Value> | void;

export type ImmerNextValue<Value> = Value | ImmerRecipe<Value>;

export type ImmerAtom<Value> = ReadableAtom<Value> & {
  readonly set: (nextValue: ImmerNextValue<Value>) => void;
};
```

`ImmerOptions` 目前没有配置项。`ImmerAtom` 会把 `set` 收窄为 recipe 或具体值。
