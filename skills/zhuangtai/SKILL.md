---
name: zhuangtai
description: Use this skill for `@zhuangtai-js/core` and `zhuangtai` questions about `atom`, `computed`, `watch`, `createAtom`, `set`, `get`, `Object.is`, and immutable reference-based state updates. Trigger it when working on the core package, core semantics, watcher behavior, computed dependency tracking, or when you need the framework-agnostic state model used by ZhuàngTài.
---

# ZhuàngTài Core

Use this skill for the framework-agnostic core in `@zhuangtai-js/core`.

Docs: https://zhuangtai.yojigen.cn

Full context: https://zhuangtai.yojigen.cn/llms-full.txt

## Install

```sh
pnpm add @zhuangtai-js/core
# npm i @zhuangtai-js/core
# yarn add @zhuangtai-js/core
```

## What it covers

- `atom(initialValue)` for writable state.
- `computed(() => value)` for derived state.
- `createAtom()` for plugin-capable atom creators.
- `get()`, `set()`, and `watch()`.

```ts
import { atom, computed, createAtom } from "@zhuangtai-js/core";

const count = atom(0);
const double = computed(() => count.get() * 2);

count.set(1);
count.set((value) => value + 1);
count.watch((value, prevValue) => {});

double.get();
double.watch((value, prevValue) => {});

const creator = createAtom();
```

## Semantics

- `set` applies immediately.
- `watch` callbacks run synchronously.
- Equality uses `Object.is`.
- Object and array updates are reference-based, so use immutable updates and return new references.
- Watcher errors are isolated. One throwing watcher does not stop the rest of the current notification round.
- A watcher added during notification is called once right away with `(currentValue, undefined)` and does not join the in-flight snapshot.
- The first `watch` call receives `prevValue === undefined` as a sentinel.
- Calling `set()` on an atom while that same atom is notifying watchers throws.
- `computed(...)` computes its initial value when created.
- `computed(...)` auto-tracks synchronous dependencies from the `.get()` calls actually made inside the derive.
- Tracking only happens inside the synchronous derive. Reads after `await` or inside `setTimeout` are not tracked.
- Nested computeds isolate dependencies.
- Multi-source computed values are synchronous snapshots, not transactional boundaries.
- `computed` also compares derived results with `Object.is`.

```ts
const flag = atom(true);
const left = atom(1);
const right = atom(2);

const current = computed(() => (flag.get() ? left.get() : right.get()));
```

## Plugins

Use `createAtom()` when you want a creator that can be extended by plugins. Install plugins on the creator, not on atom instances.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atomWithPlugins = createAtom().use(persist);

const count = atomWithPlugins(0, {
  persist: { key: "count" },
});
```

For React usage, see the `zhuangtai-react` skill. For persistence, freezing, Immer, and sync, see `zhuangtai-plugins`.

## Common mistakes

- Mutating nested objects or arrays in place. Core uses reference equality, so in-place mutation looks like no change.
- Expecting batching, async scheduling, or transactions. Core does not add hidden scheduling.
- Storing a function directly as atom state. `set(fn)` is treated as an updater.
- Assuming a computed tracks asynchronous reads. It only tracks synchronous reads inside the derive.

## When to reach for the docs

Use the docs site for deeper reference material, then this skill for quick, correct prompting and code generation.
