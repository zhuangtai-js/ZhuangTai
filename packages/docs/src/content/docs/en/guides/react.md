---
title: React quick start
description: Read and write synchronous atoms with @zhuangtai-js/react while keeping subscription boundaries explicit.
---

`@zhuangtai-js/react` fits React components that need to read, write, and automatically clean up ZhuàngTài atom subscriptions.

## Requirements and install

- `@zhuangtai-js/core` `^0.5.0`
- React >=18 <20

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

## Minimal counter

Keep state and derived values in a plain TypeScript module, then use the React adapter at the component boundary. This example uses object spread and a new array for an immutable update:

```ts title="src/state/counter.ts"
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

```tsx title="src/components/Counter.tsx"
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

export function Counter() {
  const [counter, setCounter] = useAtom(counterAtom);
  const double = useAtomValue(doubleAtom);
  const reset = useSetAtom(counterAtom);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCounter(incrementCounter)}>
        {counter.count} × 2 = {double}
      </button>
      <button
        type="button"
        onClick={() => reset({ count: 0, history: [] })}>
        reset ({counter.history.length})
      </button>
    </section>
  );
}
```

## Place the state module

Put `atom`, `computed`, and typed updaters in `src/state/` or `src/features/<feature>/state.ts`; keep components focused on rendering and events. Module-level atoms are fine for client-shared state. For server request state, call a state factory once per request so mutable references are not shared across requests.

## Choose read and write access

- **Read-write**: `useAtom(counterAtom)` returns `[value, setter]` for the counter above.
- **Read-only**: `useAtomValue(doubleAtom)` subscribes to an `Atom` or `computed` for derived display values.
- **Setter-only**: `useSetAtom(counterAtom)` returns a stable setter without subscribing, which suits reset or command buttons.

No Provider is required; components share state by importing the same atom reference.

## Lifecycle and SSR boundary

The adapter uses React's `useSyncExternalStore` to bridge Core's synchronous `get()` and `watch()`, and it unsubscribes when the component unmounts. Core still owns immediate `set`, synchronous watchers, and `Object.is` equality; React may delay DOM commits, but the adapter adds no batching or hidden scheduling.

SSR uses `get()` as the server snapshot, while hydration, request isolation, and the server state factory remain application responsibilities. Do not keep user or request-specific mutable atoms in server module scope; create independent state for every SSR request and keep the server and client initial values aligned.

## Persistence

When state must survive a reload, see the [Persist reference](/en/reference/persist/) and compose `@zhuangtai-js/persist` into the state creator. Persistence does not change the component adapter choice; keep storage and hydration at the state-module boundary.

## API reference

- [`useAtomValue`](/en/reference/react/): read-only subscription to an `Atom` or `computed`.
- [`useSetAtom`](/en/reference/react/): a setter that does not subscribe to the value.
- [`useAtom`](/en/reference/react/): read-write access.
- `createAtomHook` and `createComputedHook`: use these when you want argument-free bound hooks.

See the [React reference](/en/reference/react/) for complete signatures and subscription semantics.

## Next steps

- [Core Concepts](/en/guides/core-concepts/): learn `get`, `set`, `watch`, and `computed`.
- [Framework adapter chooser](/en/guides/framework-adapters/): compare React, Preact, Vue, Svelte, and Solid.
- [Persist reference](/en/reference/persist/): configure storage, hydration, and lifecycle controls.
