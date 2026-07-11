---
title: Freeze Reference
description: "Development-time deep freezing from @zhuangtai-js/freeze, including enabled and strict-mode semantics."
---

`@zhuangtai-js/freeze` provides development-time deep freezing for atom creators made with `createAtom()`.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/freeze
```

Install `@zhuangtai-js/core` alongside it, because it is a peer dependency of `@zhuangtai-js/freeze`.

## Install the plugin

Install `freeze` on an atom creator.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";

const atom = createAtom().use(freeze);
```

The default `atom()` export is not extended. Only atoms created with this creator accept `freeze` options.

## Protect an atom

Pass `freeze.enabled` to deep-freeze the initial value before the atom is created and new values before later updates commit.

```ts
const user = atom(
  { name: "Yuan", tags: ["a"] },
  {
    freeze: {
      enabled: true,
    },
  },
);

user.get().name = "Renamed"; // Throws during development: the object is frozen.
user.set((prev) => ({ ...prev, name: "Renamed" }));
```

## Production gating

By default the plugin freezes only outside production. When `NODE_ENV === "production"`, it becomes a no-op with no runtime overhead. You can also control it explicitly:

```ts
const state = atom(
  { count: 0 },
  {
    freeze: {
      enabled: false,
    },
  },
);
```

## Semantics

- The initial value is deep-frozen before the atom is created, and the same reference is frozen rather than a copy.
- Every `set` value is deep-frozen before being committed to the underlying state, and the return value of an updater function is frozen too.
- Deep freezing recursively freezes the own properties of objects, arrays, and functions, and terminates safely on cyclic references.
- Already-frozen values are skipped and not reprocessed.
- When freezing is disabled, the atom behaves exactly as if the plugin were not used.
- Freezing relies on `Object.freeze`, which only throws on writes in strict mode; in non-strict mode writes are silently ignored, which is inherent JavaScript behavior.
- Known limitation: content mutations on built-ins such as `Map` / `Set` / `Date` are not own-property writes, so methods may still change content after the container is frozen. freeze is a development guard for plain objects and arrays.

## Types

`@zhuangtai-js/freeze` exports these public types:

```ts
export type FreezeOptions = {
  readonly enabled?: boolean;
};
```

`FreezeOptions.enabled` is the only option. When omitted, the plugin decides whether to freeze from `NODE_ENV`.
