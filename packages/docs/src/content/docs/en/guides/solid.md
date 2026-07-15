---
title: Solid quick start
description: Connect synchronous atoms to Solid accessors and owner lifecycles with @zhuangtai-js/solid.
---

`@zhuangtai-js/solid` fits Solid components or roots that need to read, write, and automatically bind Core subscriptions to cleanup.

## Requirements and install

- `@zhuangtai-js/core` `^0.5.0`
- Solid >=1.5 <2

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

## Minimal counter

Keep the state model outside the component and call the adapter inside a Solid owner. The updater returns a new object and array instead of mutating the atom value:

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
import { createAtomSignal, createAtomValue, createSetAtom } from "@zhuangtai-js/solid";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

export function Counter() {
  const [counter, setCounter] = createAtomSignal(counterAtom);
  const double = createAtomValue(doubleAtom);
  const reset = createSetAtom(counterAtom);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCounter(incrementCounter)}>
        {counter().count} × 2 = {double()}
      </button>
      <button
        type="button"
        onClick={() => reset({ count: 0, history: [] })}>
        reset ({counter().history.length})
      </button>
    </section>
  );
}
```

## Place the state module

Put `atom`, `computed`, the type, and the updater in `src/state/` or `src/features/<feature>/state.ts`; components should connect accessors only inside an owner. Client module-level atoms can be shared. SSR user or request state must be created independently for every request.

## Choose read and write access

- **Read-write**: `createAtomSignal(counterAtom)` returns `[Accessor<Value>, setter]`.
- **Read-only**: `createAtomValue(doubleAtom)` returns an `Accessor<Value>`, read as `double()` in JSX.
- **Setter-only**: `createSetAtom(counterAtom)` returns a setter without reading or subscribing and can run outside an owner.

Client read APIs must run in a Solid component or `createRoot` owner; setter-only access does not require an owner.

## Lifecycle and SSR boundary

On the client, `createAtomValue` binds the Core watcher to the current owner and stops it with `onCleanup`; when you create a manual `createRoot`, keep and call its returned `dispose`. Core still owns immediate `set`, synchronous `watch`, `Object.is` equality, and immutable reference boundaries.

The standard server `renderToString` path uses `isServer` from `solid-js/web` to read one snapshot without checking for an owner or creating a Core subscription. SSR still needs independent atoms per request; do not share mutable server module-scope state.

## Persistence

When state must survive a reload, see the [Persist reference](/en/reference/persist/) and compose `@zhuangtai-js/persist` in the state creator. Persistence controls belong to the state module; Solid components only choose accessor and setter APIs.

## API reference

- [`createAtomValue`](/en/reference/solid/): converts a `ReadableAtom` to an accessor.
- [`createSetAtom`](/en/reference/solid/): returns a setter that does not subscribe to the value.
- [`createAtomSignal`](/en/reference/solid/): combines an accessor and setter.

See the [Solid reference](/en/reference/solid/) for complete owner, cleanup, SSR, and reference semantics.

## Next steps

- [Core Concepts](/en/guides/core-concepts/): learn synchronous `get`, `set`, `watch`, and `computed`.
- [Framework adapter chooser](/en/guides/framework-adapters/): compare owner and lifecycle boundaries.
- [Persist reference](/en/reference/persist/): configure storage, hydration, and lifecycle controls.
