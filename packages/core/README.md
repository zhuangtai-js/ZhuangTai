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
