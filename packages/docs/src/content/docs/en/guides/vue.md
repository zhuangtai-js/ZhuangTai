---
title: Vue quick start
description: Connect synchronous atoms to Vue ComputedRef values, effect scopes, and component lifecycles with @zhuangtai-js/vue.
---

`@zhuangtai-js/vue` fits Vue components that need read-only ComputedRefs, setters, and automatic scope cleanup for ZhuàngTài state.

## Requirements and install

- `@zhuangtai-js/core` `^0.5.0`
- Vue >=3.2 <4

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

## Minimal counter

Keep the state model outside the component and call the Vue adapter from `setup()`. The updater returns a new object and array, preserving Core's reference equality:

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

```vue title="src/components/Counter.vue"
<script setup lang="ts">
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/vue";
import { counterAtom, doubleAtom, incrementCounter } from "../state/counter";

const [counter, setCounter] = useAtom(counterAtom);
const double = useAtomValue(doubleAtom);
const reset = useSetAtom(counterAtom);

function increment() {
  setCounter(incrementCounter);
}
</script>

<template>
  <section>
    <button
      type="button"
      @click="increment">
      {{ counter.count }} × 2 = {{ double }}
    </button>
    <button
      type="button"
      @click="reset({ count: 0, history: [] })">
      reset ({{ counter.history.length }})
    </button>
  </section>
</template>
```

## Place the state module

Put `atom`, `computed`, the type, and the updater in `src/state/` or `src/features/<feature>/state.ts`; keep `setup()` focused on connecting state to the view. Module-level atoms suit client-shared state. For SSR, create user or request state independently for every request instead of reusing a mutable server module-scope reference.

## Choose read and write access

- **Read-write**: `useAtom(counterAtom)` returns `[ComputedRef<Value>, setter]`; the first value is read-only.
- **Read-only**: `useAtomValue(doubleAtom)` returns a read-only `ComputedRef` that templates can use directly.
- **Setter-only**: `useSetAtom(counterAtom)` returns a setter without reading or subscribing to the atom.

Call read APIs inside component `setup()`, `<script setup>`, or an active `effectScope`; setter-only access does not require an active scope.

## Lifecycle and SSR boundary

On the client, read APIs register the Core watcher with the current Vue effect scope and clean it up when the scope stops or the component unmounts. Core still owns immediate `set`, synchronous `watch`, `Object.is` equality, and reference-based object updates; Vue's scheduler still controls DOM commits.

In `createSSRApp` component `setup()`, the Vue SSR path only reads an `atom.get()` snapshot and creates a read-only `ComputedRef`; it does not install a Core subscription. If the application creates an `effectScope()` outside a component, it must call `scope.stop()` at the end of the request and create independent state per request.

## Persistence

When state must survive a reload, see the [Persist reference](/en/reference/persist/) and compose `@zhuangtai-js/persist` in the state creator. Keep storage, hydration, and request isolation in the state module; components only choose their read/write API.

## API reference

- [`useAtomValue`](/en/reference/vue/): returns a read-only `ComputedRef`.
- [`useSetAtom`](/en/reference/vue/): returns a setter that does not subscribe to the value.
- [`useAtom`](/en/reference/vue/): combines the read-only `ComputedRef` and setter.

See the [Vue reference](/en/reference/vue/) for complete effect-scope, SSR, and reference semantics.

## Next steps

- [Core Concepts](/en/guides/core-concepts/): learn synchronous `get`, `set`, `watch`, and `computed`.
- [Framework adapter chooser](/en/guides/framework-adapters/): compare native lifecycles across adapters.
- [Persist reference](/en/reference/persist/): configure storage, hydration, and lifecycle controls.
