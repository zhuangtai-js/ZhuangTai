---
title: Core
description: "Core APIs from @zhuangtai-js/core."
---

`@zhuangtai-js/core` provides framework-agnostic state primitives.

## atom

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});
```

Semantics:

- `set()` updates the value immediately.
- `watch()` runs synchronously and is called once when registered.
- Equality uses `Object.is`.
- Objects and arrays are compared by reference.
- Store function values with `set(() => fn)`.
- Calling `set()` on an atom while that same atom is notifying watchers throws.

## computed

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);
```

`computed()` calculates its initial value when created. It subscribes to sources only while watched, and `get()` recalculates from current source values.
