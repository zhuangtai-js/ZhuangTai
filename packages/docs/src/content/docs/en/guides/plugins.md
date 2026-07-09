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

Local `set()` calls flow through the composed creator behavior. Remote `sync` broadcasts are different. They write straight to the underlying state, which means they bypass the `set` logic of plugins wrapped above `sync`.

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

## Two things to remember

First, each plugin only affects the creator it is installed on. Second, updates coming from `sync` bypass outer `set` logic, so do not depend on a plugin wrapper to intercept those incoming broadcasts.

That is why `createAtom()` matters. It lets you decide which behaviors belong in the state line before you create the atom instance itself.

## Next steps

- Read [Core Concepts](/en/guides/core-concepts/) to get the `set`, `watch`, and `computed` model straight.
- Read [Persist reference](/en/reference/persist/) for storage and codec details.
