---
title: Preact quick start
description: Connect synchronous atoms to Preact hooks with @zhuangtai-js/preact and let components own subscription lifecycles.
---

`@zhuangtai-js/preact` fits lightweight Preact components that subscribe to ZhuàngTài atoms and computeds and update directly.

## Requirements and install

- `@zhuangtai-js/core` `^0.5.0`
- Preact >=10.9 <11

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

## Minimal counter

Keep shared state in a plain TypeScript module and let the Preact adapter own subscriptions. The updater below returns a new object and array instead of mutating the previous value:

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
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";
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

Put `atom`, `computed`, and the updater in `src/state/` or `src/features/<feature>/state.ts`; components should import state and render it. Module-level atoms suit browser-shared state. On the server, call a state factory for every request instead of reusing a mutable atom across requests.

## Choose read and write access

- **Read-write**: `useAtom(counterAtom)` returns `[value, setter]`.
- **Read-only**: `useAtomValue(doubleAtom)` subscribes to any readable atom, including a `computed`.
- **Setter-only**: `useSetAtom(counterAtom)` returns a stable setter without subscribing to the value.

`createAtomHook` and `createComputedHook` bind fixed atoms into argument-free hooks; they do not introduce another state model.

## Lifecycle and SSR boundary

The adapter uses native Preact hooks and `useSyncExternalStore` from `preact/compat`. Component unmounts clean up subscriptions, and computed snapshots are cached so a fresh object on every read does not cause a loop. Core still owns immediate `set`, synchronous `watch`, `Object.is` equality, and immutable reference boundaries.

Server rendering uses a browser-independent snapshot reader and does not create a client subscription. Hydration and request isolation remain application responsibilities: create independent user or request state for every SSR request and keep the client initial value aligned with the server output.

## Persistence

When state must survive a reload, see the [Persist reference](/en/reference/persist/) and compose `@zhuangtai-js/persist` in the state creator. The adapter only handles Preact subscriptions; keep storage and hydration in the state module.

## API reference

- [`useAtomValue`](/en/reference/preact/): read-only subscription to an `Atom` or `computed`.
- [`useSetAtom`](/en/reference/preact/): a setter that does not subscribe to the value.
- [`useAtom`](/en/reference/preact/): read-write access.
- `createAtomHook` and `createComputedHook`: argument-free factories for fixed atoms.

See the [Preact reference](/en/reference/preact/) for complete signatures, snapshots, and SSR semantics.

## Next steps

- [Core Concepts](/en/guides/core-concepts/): learn the synchronous state primitives.
- [Framework adapter chooser](/en/guides/framework-adapters/): compare read/write and lifecycle APIs.
- [Persist reference](/en/reference/persist/): configure storage, hydration, and lifecycle controls.
