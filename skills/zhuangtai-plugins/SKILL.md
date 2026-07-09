---
name: zhuangtai-plugins
description: Use this skill for `createAtom().use(plugin)`, per-atom plugin options, and the ZhuàngTài plugins `persist`, `freeze`, `immer`, and `sync`. Trigger it when working with `@zhuangtai-js/persist`, `@zhuangtai-js/freeze`, `@zhuangtai-js/immer`, `@zhuangtai-js/sync`, plugin composition, Web Storage persistence, deep freeze, Immer recipes, or BroadcastChannel sync.
---

# ZhuàngTài Plugins

Use this skill for plugin composition around `createAtom().use(plugin)`.

Docs: https://zhuangtai.yojigen.cn

Full context: https://zhuangtai.yojigen.cn/llms-full.txt

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist @zhuangtai-js/freeze @zhuangtai-js/immer @zhuangtai-js/sync immer react
# npm i @zhuangtai-js/core @zhuangtai-js/persist @zhuangtai-js/freeze @zhuangtai-js/immer @zhuangtai-js/sync immer react
# yarn add @zhuangtai-js/core @zhuangtai-js/persist @zhuangtai-js/freeze @zhuangtai-js/immer @zhuangtai-js/sync immer react
```

## Plugin composition

Start with `createAtom()`, then install plugins on the creator.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: { key: "theme" },
});
```

- Plugins are installed on creators, not on atom instances.
- Installing the same plugin more than once returns a creator with the same behavior.
- Options are per atom, passed as the second argument to the created atom factory.

## `persist`

Use `persist` for synchronous Web Storage-compatible storage.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: { key: "theme" },
});
```

- Restores stored values before the first `get()`.
- Updates persist first, then commit in-memory state after a successful storage write.
- If encode or storage write fails, the in-memory state stays unchanged.
- `Object.is` no-op updates do not write to storage.
- If `storage` is omitted, it uses `globalThis.localStorage` when available.
- Custom `storage` must provide `getItem`, `setItem`, and `removeItem`.
- The default codec uses `JSON.stringify` and `JSON.parse`.

## `freeze`

Use `freeze` to deep-freeze values during development.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);

const user = atom({ name: "Yuan" }, {
  freeze: { enabled: true },
});
```

- The initial value is deep-frozen before the atom is created.
- Every `set` value is deep-frozen before commit.
- Updater return values are frozen too.
- By default it is enabled outside production and disabled in production.
- `enabled` overrides `NODE_ENV`.

## `immer`

Use `immer` when you want updater functions to run through Immer's `produce`.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";

const atom = createAtom().use(immer);

const todos = atom([{ text: "a", done: false }]);

todos.set((draft) => {
  draft[0].done = true;
  draft.push({ text: "b", done: false });
});

todos.set((draft) => draft.filter((todo) => !todo.done));
```

- `set(fn)` is treated as an Immer recipe.
- Direct values passed to `set(value)` bypass Immer.
- Immer produces new immutable references.
- `undefined` from a recipe means no change. Use Immer's `nothing` token if you need to produce `undefined`.

## `sync`

Use `sync` for cross-context state sharing through `BroadcastChannel`.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);

const theme = atom("light", {
  sync: { key: "theme" },
});
```

- Local updates commit first, then broadcast the concrete value.
- Incoming broadcasts decode and write straight to the underlying state.
- That direct write prevents echo loops.
- `Object.is` no-op updates are not broadcast.
- If `channel` is omitted, it uses `new BroadcastChannel(key)`.
- Under SSR or in runtimes without `BroadcastChannel`, it silently degrades to a plain atom.
- The default `BroadcastChannel` is unref'ed when supported, so it does not keep Node alive.
- `channel` and `codec` are per-atom options.

## Common mistakes

- Expecting plugin behavior on plain atoms. Plugins only apply to creators made with `createAtom()`.
- Mutating values in place before `persist`, `freeze`, or `sync` can see them. Core still uses reference equality.
- Expecting async storage or async channels. These plugins only support synchronous mechanisms.
- Expecting `sync` to persist state across devices. It only works across same-origin contexts.
