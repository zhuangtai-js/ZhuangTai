---
title: Svelte quick start
description: Convert ZhuàngTài atoms to standard Svelte stores with @zhuangtai-js/svelte while keeping Svelte's subscription lifecycle.
---

`@zhuangtai-js/svelte` fits Svelte applications that want standard store syntax while preserving Core's synchronous updates and reference semantics.

## Requirements and install

- `@zhuangtai-js/core` `^0.5.0`
- Svelte >=4.2 <6

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

## Minimal counter

Keep the state model in a plain TypeScript module; `toWritable` provides a read-write store and `toReadable` provides a read-only computed store. The `update` callback returns a new object and array:

```ts title="src/lib/counter.ts"
import { atom, computed } from "@zhuangtai-js/core";

export type CounterState = {
  count: number;
  history: number[];
};

export const counterAtom = atom<CounterState>({ count: 0, history: [] });
export const doubleAtom = computed(() => counterAtom.get().count * 2);

export function incrementCounter(state: CounterState): CounterState {
  const count = state.count + 1;
  return { ...state, count, history: [...state.history, count] };
}
```

```svelte title="src/components/Counter.svelte"
<script lang="ts">
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";
  import { counterAtom, doubleAtom, incrementCounter } from "../lib/counter";

  const counter = toWritable(counterAtom);
  const double = toReadable(doubleAtom);

  function reset() {
    counter.set({ count: 0, history: [] });
  }
</script>

<button type="button" on:click={() => counter.update(incrementCounter)}>
  {$counter.count} × 2 = {$double}
</button>
<button type="button" on:click={reset}>
  reset ({$counter.history.length})
</button>
```

## Place the state module

Put `atom`, `computed`, the type, and the updater in `src/lib/` or `src/lib/<feature>/state.ts`; components only convert them to stores. Module-level atoms suit browser-shared state. For SSR, create independent state for every request instead of sharing a mutable server module singleton.

## Choose read and write access

- **Read-write**: `toWritable(counterAtom)` returns a standard `Writable` with `$counter`, `set`, and `update`.
- **Read-only**: `toReadable(doubleAtom)` returns a standard `Readable` for `$double` in a template.
- **Setter-only**: the Svelte adapter has no separate setter-only export; a command module can call `counterAtom.set(nextValue)` directly without creating a store subscription.

When subscribing to `toReadable` or `toWritable` manually, keep and call the stopper returned by `subscribe`; Svelte automatically subscribes and cleans up `$store` usage in templates.

## Lifecycle and SSR boundary

The adapter implements the standard `svelte/store` protocol and adds no scheduling, batching, or browser API. Svelte owns subscription and cleanup for `$store`; manual `subscribe` calls must invoke their stopper at the lifecycle boundary. Core still decides when `set` takes effect, when `watch` runs, how `Object.is` equality works, and how immutable references are handled.

The SSR boundary comes from the underlying atoms and the application's request lifecycle: create independent state and stores for every request, and never put user state in a mutable server module singleton. Keep the client initial value aligned with the server output during hydration.

## Persistence

When state must survive a reload, see the [Persist reference](/en/reference/persist/) and compose `@zhuangtai-js/persist` in the state creator. Persistence controls belong to the state module; Svelte components only consume the store.

## API reference

- [`toReadable`](/en/reference/svelte/): converts a `ReadableAtom` to a Svelte `Readable`.
- [`toWritable`](/en/reference/svelte/): converts a writable `Atom` to a Svelte `Writable` with `set` and `update`.

See the [Svelte reference](/en/reference/svelte/) for complete store, subscription, and SSR semantics.

## Next steps

- [Core Concepts](/en/guides/core-concepts/): learn the synchronous state primitives and immutable updates.
- [Framework adapter chooser](/en/guides/framework-adapters/): compare native reactive APIs.
- [Persist reference](/en/reference/persist/): configure storage, hydration, and lifecycle controls.
