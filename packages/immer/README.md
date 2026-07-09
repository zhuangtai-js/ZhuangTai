# @zhuangtai-js/immer

ZhuàngTài atom 的 Immer 插件。

`@zhuangtai-js/immer` 扩展来自 `@zhuangtai-js/core` 的 atom creator。core 的对象和数组更新基于引用，需要你手写不可变更新。这个插件把 updater 函数交给 Immer 的 `produce` 执行，让你用直接“修改草稿”的直观写法完成更新，同时仍然产出新引用、保持不可变。

## 安装

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/immer immer
```

## 使用

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

// 直接“修改草稿”，Immer 会产出新引用后提交。
todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});

// 也可以直接返回新值。
todos.set((draft) => draft.filter((todo) => !todo.done));
```

## 语义

- updater 函数（`set(fn)`）作为 Immer recipe 执行：既可以修改草稿并返回，也可以直接返回新值，两种写法都能正常工作。
- 直接传入的具体值（`set(value)`）不经过 Immer，直接提交，行为与 core 一致。
- Immer 产出的都是全新的不可变引用，原有状态不会被就地修改。
- 通过 `set(value)` 提交给底层状态的始终是具体值，因此 core 不会把它再当作 updater 重复执行。
- `createAtom().use(immer)` 产出的 atom 类型与普通 atom 不同：其 `set` 接受直接“修改草稿”的 recipe（可返回 void）。
- Immer 的 recipe 返回 `undefined` 会被视为“未修改”；如需产出 `undefined`，请使用 Immer 的 `nothing` token。

## 许可证

`@zhuangtai-js/immer` 使用 [ISC 许可证](./LICENSE) 发布。你可以自由使用、复制、修改和分发，但需要在副本中保留版权声明和许可证声明。

---

# @zhuangtai-js/immer

Immer plugin for ZhuàngTài atoms.

`@zhuangtai-js/immer` extends atom creators from `@zhuangtai-js/core`. Core's object and array updates are reference-based, requiring you to write immutable updates by hand. This plugin runs updater functions through Immer's `produce`, letting you write updates by directly "mutating a draft" while still producing a new reference and staying immutable.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/immer immer
```

## Usage

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

// Directly "mutate the draft"; Immer produces a new reference before committing.
todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});

// You can also return a new value directly.
todos.set((draft) => draft.filter((todo) => !todo.done));
```

## Semantics

- Updater functions (`set(fn)`) run as Immer recipes: you can mutate the draft and return it, or return a new value directly; both styles work.
- Concrete values passed directly (`set(value)`) bypass Immer and are committed as-is, matching core.
- Immer always produces a brand-new immutable reference; the previous state is never mutated in place.
- The value committed to the underlying state via `set(value)` is always concrete, so core never re-invokes it as an updater.
- `createAtom().use(immer)` yields an atom type distinct from a plain atom: its `set` accepts a recipe that directly "mutates the draft" (and may return void).
- An Immer recipe that returns `undefined` is treated as "no change"; to produce `undefined`, use Immer's `nothing` token.

## License

`@zhuangtai-js/immer` is released under the [ISC License](./LICENSE). You may use, copy, modify, and distribute it freely, provided that the copyright notice and license notice are retained in copies.
