---
title: Core Reference
description: atom, computed, createAtom, and core types from @zhuangtai-js/core.
---

`@zhuangtai-js/core` provides framework-agnostic state primitives. It has no third-party runtime dependencies and no hidden scheduling.

## Install

```sh
pnpm add @zhuangtai-js/core
```

## `atom()`

Create readable, writable, watchable state.

```ts
import { atom } from "@zhuangtai-js/core";

const count = atom(0);

count.get();
count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});
```

### `get()`

Return the current value.

```ts
const value = count.get();
```

### `set(nextValue)`

Update the value immediately. `nextValue` can be a value or an updater function.

```ts
count.set(1);
count.set((value) => value + 1);
```

Function values are not supported as atom values: `set(fn)` treats `fn` as an updater, and passing a function type when defining an atom is a type error. To store a function, wrap it in an object, e.g. `atom({ fn })`.

```ts
const fnAtom = atom({ fn: () => {} });
const nextFn = () => {};

fnAtom.set({ fn: nextFn });
```

### `watch(callback)`

Register a synchronous watcher and call it once immediately with the current value. The return value stops the watcher.

```ts
const stop = count.watch((value, prevValue) => {
  console.log(value, prevValue);
});

stop();
```

Calling `set()` on an atom while that same atom is notifying watchers throws. Watchers may update other atoms, but avoid cycles.

## `computed()`

Derive read-only state from one or more source atoms.

```ts
import { atom, computed } from "@zhuangtai-js/core";

const count = atom(1);
const double = computed(count, (value) => value * 2);

double.get(); // 2
```

Pass multiple sources as a readonly array.

```ts
const firstName = atom("Ada");
const lastName = atom("Lovelace");

const fullName = computed([firstName, lastName] as const, (first, last) => `${first} ${last}`);
```

`computed()` calculates its initial value when created. It subscribes to sources only while watched, and `get()` recalculates from current source values.

## `createAtom()`

Create an atom creator that can install plugins. The default `atom()` export stays unextended.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

Plugins are installed on creators, not atom instances.

## Core types

`@zhuangtai-js/core` exports common public types:

- `Atom<Value>`
- `Computed<Value>`
- `ReadableAtom<Value>`
- `NextValue<Value>`
- `Watcher<Value>`
- `StopWatch`
- `AtomValue<Atom>`
- `AtomValues<Sources>`
- `AtomCreator`
- `AtomCreatorPlugin`
- `AtomCreatorPluginContext`

Internal creator argument types are not exported from the package entrypoint.

## Semantics quick reference

- `set()` applies immediately.
- `watch()` runs synchronously and is called once when registered (`prevValue` is an `undefined` sentinel). For an `Atom<T | undefined>` this cannot distinguish the first notification from a previous value that happened to be `undefined`.
- Equality uses `Object.is`.
- Object and array updates are reference-based; use immutable updates.
- Watcher callbacks are isolated: a throwing watcher does not interrupt the current round; after all watchers run, a single error is rethrown as-is and multiple errors are rethrown in an `AggregateError`.
- A watcher added during notification is immediately invoked once with `(currentValue, undefined)`, but does not join the broadcast snapshot in progress.
- A multi-source `computed` is a synchronous snapshot, not a transactional consistency boundary: updating several sources one by one, or updating other sources from within a watcher, can expose intermediate combinations; keep tightly coupled values in the same atom.
- `computed` compares derived results with `Object.is`; a derive that returns a new object/array every time is treated as changed and may notify repeatedly, so return a reference-stable value when you need to suppress notifications.
- Plugins are idempotent by id: installing a plugin with the same id via `use()` is a no-op, and plugin ids must be globally unique.
- The core does not add hidden batching, deferring, debouncing, or transactions.
