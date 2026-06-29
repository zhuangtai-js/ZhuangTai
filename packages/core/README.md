# @zhuangtai-js/core

Simple, direct state primitives for JavaScript.

`@zhuangtai-js/core` is the framework-agnostic core of ZhuàngTài. It has no third-party runtime dependencies and no hidden scheduling.

## Install

```sh
pnpm add @zhuangtai-js/core
```

## Core API

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(count, (value) => value * 2);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});
```

## Semantics

- `set` applies immediately.
- `watch` callbacks run synchronously.
- Equality uses `Object.is`.
- Object and array updates are reference-based; use immutable updates.
- Function values follow the same ambiguity as React state setters: `set(fn)` treats `fn` as an updater. To store a function value, wrap it: `set(() => fn)`.
- `computed(...)` calculates its initial value when it is created. It subscribes to sources only while it has watchers, and `get()` recalculates from the current source values.

## Creator plugins

Use `createAtom()` when you want an atom creator that can be extended by plugins. The default `atom()` export stays unextended and takes only the initial value.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);

const count = atom(0, {
  persist: {
    key: "count",
  },
});
```

Plugins are installed on creators, not atom instances. Installing the same plugin more than once returns a creator with the same behavior.
