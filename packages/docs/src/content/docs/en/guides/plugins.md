---
title: Plugins & Composition
description: Learn createAtom(), .use(plugin), and how to choose between ZhuàngTài's four common plugins.
---

ZhuàngTài keeps the core thin on purpose. Plugins are what make it fit different jobs. You can think of them as layers around an atom creator. They do not replace the core model. They extend it.

## Why `createAtom()` exists

`atom()` is the default export, and it stays unextended. It only takes an initial value. When you want plugins, start from `createAtom()`.

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

That split is simple. Use plain `atom()` for a bare core state unit. Use `createAtom()` when you want `persist`, `sync`, `freeze`, or `immer`.

## How `.use(plugin)` composes

Plugins install on creators, not on atom instances. You can chain them:

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

`.use()` builds creator layers from left to right, and each later plugin becomes the outer layer. In this example, `sync` is outermost and `persist` is inside it. A local `theme.set("dark")` enters the `sync` wrapper first, then flows inward through `context.next()` to `persist`, and finally reaches the underlying atom.

Layer order also determines the public TypeScript shape. The outermost plugin's declared `kind` determines the final creator and atom type. For example, `createAtom().use(immer).use(freeze)` ends with freeze's default kind, so it does not incorrectly expose the Immer recipe setter.

A plugin ID may only be installed once. Repeating `.use()` with the same ID on one creator throws a `TypeError` synchronously, preventing ambiguous options and wrapper behavior.

Remote `sync` broadcasts are different. They write to the inner state captured when `sync` is created. The update still passes through plugins installed before and inside `sync` (`persist` in this example), but it bypasses `sync`'s broadcasting `set` and wrappers installed later outside it. This is why layer order and responsibility boundaries matter.

## A realistic combination: persisted, synced theme state

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

This is a good fit for preferences like theme, language, or panel state. `persist` keeps the value after a reload. `sync` keeps same-origin tabs in step. Together they feel natural: change it once, and the rest follows.

## Choose your plugin

| Plugin    | Best for                                        | Typical use                                          |
| --------- | ----------------------------------------------- | ---------------------------------------------------- |
| `persist` | Saving state in synchronous storage             | Theme, language, drafts, user preferences            |
| `freeze`  | Catching accidental mutation during development | Complex objects and arrays                           |
| `immer`   | Writing immutable updates with draft syntax     | Deep objects, list updates                           |
| `sync`    | Sharing state across same-origin contexts       | Multi-tab themes, linked panels, window coordination |

If your main worry is accidental mutation, start with `freeze`. If immutable updates feel too verbose, start with `immer`. If you need values after reload, use `persist`. If you want same-origin tabs to stay aligned, use `sync`.

## Composition boundaries to remember

- A plugin only affects the creator it is installed on.
- Later `.use()` calls create outer wrapper layers; local `set()` flows from outer to inner.
- The outermost plugin's `kind` determines the final public type.
- Plugin IDs must be unique; duplicate installation fails synchronously.
- Remote `sync` updates write its inner state: inner plugins still run, but `sync` itself and outer plugin `set` wrappers are bypassed.
- When you need both persistence and cross-tab sync, use `createAtom().use(persist).use(sync)` (`persist` inside, `sync` outside). The reverse order does not write storage for remote updates.
- When you need Immer recipes plus development freezes, use `createAtom().use(freeze).use(immer)` (`immer` outside). `use(immer).use(freeze)` treats functions as plain updaters against already-frozen values.

That is why `createAtom()` matters. It lets you decide which behaviors belong in the state line before you create the atom instance itself.

## Current support range

The current plugin release lines `freeze@0.2.x`, `immer@0.2.x`, `persist@0.4.x`, and `sync@0.2.x` declare `@zhuangtai-js/core@^0.5.0`. See [Integrations and Compatibility](/en/integrations/) for the independent peer ranges of framework adapters.

## Next steps

- Read [Core Concepts](/en/guides/core-concepts/) to get the `set`, `watch`, and `computed` model straight.
- Read [Persist reference](/en/reference/persist/) for storage and codec details.
