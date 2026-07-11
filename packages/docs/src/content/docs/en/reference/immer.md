---
title: Immer Reference
description: "Draft updates, recipe semantics, and public types from @zhuangtai-js/immer."
---

`@zhuangtai-js/immer` provides Immer-powered updates for atom creators made with `createAtom()`.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/immer
```

`@zhuangtai-js/core` is a peer dependency and must be installed by the application. `immer` is a regular runtime dependency and is installed automatically with `@zhuangtai-js/immer`.

## Install the plugin

Install `immer` on an atom creator.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);
```

The default `atom()` export is not extended. Only atoms created with this creator accept Immer recipe updates.

## Update an atom with a draft

Updater functions run as Immer recipes. You can mutate the draft directly, or return a new value directly.

```ts
const todos = atom([{ text: "a", done: false }]);

todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});

todos.set((draft) => draft.filter((todo) => !todo.done));
```

## Pass a concrete value directly

If you pass a concrete value directly, `immer` does not intervene and the behavior matches core exactly.

```ts
todos.set([{ text: "only", done: true }]);
```

## Semantics

- Updater functions inside `set(fn)` run as Immer recipes, so they can mutate the draft and return it, or return a new value directly.
- Concrete values passed directly (`set(value)`) bypass Immer and are committed as-is, matching core.
- Immer never mutates the previous state in place; actual changes produce a new reference, while no-op recipes may reuse the previous reference.
- The value committed to the underlying state via `set(value)` is always concrete, so core never re-invokes it as an updater.
- `createAtom().use(immer)` yields an atom type distinct from a plain atom, and its `set` accepts a recipe that directly mutates the draft and may return `void`.
- An Immer recipe that returns `undefined` is treated as no change. To produce `undefined`, use Immer's `nothing` token.

## Types

`@zhuangtai-js/immer` exports these public types:

```ts
export type ImmerOptions = Record<never, never>;

export type ImmerRecipe<Value> = (draft: Draft<Value>) => Draft<Value> | void;

export type ImmerNextValue<Value> = Value | ImmerRecipe<Value>;

export type ImmerAtom<Value> = ReadableAtom<Value> & {
  readonly set: (nextValue: ImmerNextValue<Value>) => void;
};
```

`ImmerOptions` currently has no configuration fields. `ImmerAtom` narrows `set` to recipes or concrete values.
