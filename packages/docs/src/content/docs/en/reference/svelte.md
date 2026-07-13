---
title: Svelte Reference
description: "Standard store conversion, subscription lifecycle, and SSR boundaries for @zhuangtai-js/svelte."
---

`@zhuangtai-js/svelte` converts Core atoms and computeds into standard `svelte/store` objects without adding runes or extra scheduling.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

Peer ranges are `@zhuangtai-js/core ^0.5.0` and Svelte `>=4.2 <6`.

## `toReadable(source)`

Converts a `ReadableAtom<Value>`, including a writable atom or computed, into a Svelte `Readable<Value>`.

```ts
import { atom, computed } from "@zhuangtai-js/core";
import { toReadable } from "@zhuangtai-js/svelte";

const countAtom = atom(1);
const double = toReadable(computed(() => countAtom.get() * 2));
```

`subscribe(run, invalidate?)` connects directly to Core `watch`. Because `watch` synchronously emits the current value, `run` executes synchronously exactly once during subscription. Every later notification calls the optional invalidator before `run`.

## `toWritable(source)`

Converts a writable `Atom<Value>` into a Svelte `Writable<Value>`.

```ts
import { toWritable } from "@zhuangtai-js/svelte";

const count = toWritable(countAtom);
count.set(2);
count.update((value) => value + 1);
```

`set(value)` calls Core `set(value)` directly. `update(updater)` passes the updater to Core, so it receives the latest value at execution time.

## Use native Svelte store APIs

```svelte
<script lang="ts">
  import { derived, readonly } from "svelte/store";
  import { atom } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const visibleCount = readonly(count);
  const label = derived(toReadable(countAtom), (value) => `Count: ${value}`);
</script>

<button on:click={() => count.update((value) => value + 1)}>{$label}</button>
```

Converted objects work with `$store`, `derived`, `get`, `readonly`, and other `svelte/store` APIs.

## Lifecycle and errors

- `$store` owns subscription and cleanup automatically. Keep and call the returned stopper for a manual `subscribe` call.
- The stopper comes directly from Core `watch`, and calling it immediately stops later notifications.
- Errors from subscribers, invalidators, or Core propagate synchronously and are not replaced by the adapter.
- The adapter creates no shared state across atoms.

## Equality and updates

The adapter performs no second comparison. Core `Object.is` decides notifications: repeated `NaN` values do not notify, while `0` and `-0` are distinct. Objects and arrays are reference-based and require immutable updates. There is no scheduling, batching, deferring, or transaction layer.

## SSR

The adapter itself uses no browser API, so the normal store contract can run on the server. State ownership is the real boundary: create atoms and converted stores per request instead of sharing user-specific mutable state from server module scope. Use initial values that match the server output during hydration.

`@zhuangtai-js/persist` reads `localStorage` by default, so server code must pass explicit synchronous storage or create the persisted atom only on the client.

## When to use Core directly

Use Core directly when code does not need `$store`, `derived`, or Svelte-owned lifecycle. Common examples include server loaders, shared data layers, SDKs, and framework-independent modules.
