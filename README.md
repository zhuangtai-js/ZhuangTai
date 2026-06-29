![ZhuàngTài - 状态](./assets/header.png)

# ZhuàngTài 状态

Simple, direct state primitives for JavaScript.

ZhuàngTài is a tiny TypeScript state library with a framework-agnostic core and no hidden scheduling.

## Packages

- `@zhuangtai-js/core`: the zero-runtime-dependency state core.
- `@zhuangtai-js/persist`: persistence plugin for atoms created with `createAtom()`.
- `@zhuangtai-js/react`: planned React adapter, not implemented yet.

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

`@zhuangtai-js/core` intentionally has no third-party runtime dependencies. Framework adapters live in separate packages.

## Persistence

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

`@zhuangtai-js/persist` uses synchronous Web Storage-compatible storage. Pass a `storage` option explicitly, or it falls back to `globalThis.localStorage` when available.
