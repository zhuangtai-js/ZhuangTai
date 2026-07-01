---
title: Getting Started
description: Install ZhuàngTài, create your first atom, and add persistence when needed.
---

This guide walks through the smallest useful ZhuàngTài flow: install the core package, create state, watch changes, and add the persistence plugin when you need it.

## Install the core package

Install `@zhuangtai-js/core` with your package manager:

```sh
pnpm add @zhuangtai-js/core
```

`@zhuangtai-js/core` has no third-party runtime dependencies.

## Create an atom

`atom()` creates readable, writable, watchable state.

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get(); // 0
count.set(1);
count.set((value) => value + 1);
count.get(); // 2
```

`set()` updates the value immediately. If you pass a function, it is treated as an updater and receives the current value.

## Derive state

Use `computed()` to derive read-only state from one or more atoms.

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);

double.get(); // 2
count.set(2);
double.get(); // 4
```

`computed()` does not keep stale cached values. Calling `get()` recalculates from the current source values.

## Watch changes

`watch()` registers a synchronous watcher and immediately calls it once with the current value.

```ts
const stop = count.watch((value, prevValue) => {
  console.log({ value, prevValue });
});

count.set(3);
stop();
```

Do not call `set()` for the same atom from inside that atom's watcher; self-reentrant updates throw. Watchers may update other atoms, but avoid cycles.

## Add persistence

Install `@zhuangtai-js/persist` when you need to save state to synchronous storage:

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

Create an extensible atom creator with `createAtom()`, then install the `persist` plugin.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

If you do not pass `storage`, the plugin uses `globalThis.localStorage`. For custom storage or codecs, read the [Persist Reference](/en/reference/persist/).

## Next steps

- Read the [Core Reference](/en/reference/core/) for the full core API.
- Read the [Persist Reference](/en/reference/persist/) to configure storage and codecs.
