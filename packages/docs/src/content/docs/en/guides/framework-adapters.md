---
title: Framework Adapter Best Practices
description: Use native Preact, Svelte, Vue, and Solid APIs with correct lifecycle, SSR, and request-isolation boundaries.
---

ZhuàngTài adapters only connect Core `get`, `set`, and `watch` to each framework's native reactive interface. Core still decides when state changes: `set` applies immediately, `watch` runs synchronously, equality uses `Object.is`, and objects and arrays require immutable updates.

## Choose a package and API

Every adapter requires `@zhuangtai-js/core ^0.5.0` and declares only the framework peer range shown below.

| Framework | Package                | Peer range          | Native API                                                                                     |
| --------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Preact    | `@zhuangtai-js/preact` | Preact `>=10.9 <11` | `useAtomValue`, `useSetAtom`, `useAtom`, `createAtomHook`, `createComputedHook`                |
| Svelte    | `@zhuangtai-js/svelte` | Svelte `>=4.2 <6`   | `toReadable` and `toWritable`, returning `svelte/store` objects                                |
| Vue       | `@zhuangtai-js/vue`    | Vue `>=3.2 <4`      | `useAtomValue`, `useSetAtom`, and `useAtom`, returning a `ComputedRef` and setter              |
| Solid     | `@zhuangtai-js/solid`  | Solid `>=1.5 <2`    | `createAtomValue`, `createSetAtom`, and `createAtomSignal`, returning an `Accessor` and setter |

If state is only used outside framework lifecycle, install and use `@zhuangtai-js/core` directly.

## Shared principles

### Let the framework own subscription lifecycle

- Use a read-only API for read-only components and a setter-only API for write-only components to avoid unnecessary subscriptions.
- Let Preact hooks, Svelte `$store`, Vue effect scopes, or Solid client owners manage cleanup.
- Keep and call the returned unsubscribe function when using Svelte `subscribe` manually.
- When you create a Vue `effectScope()` or Solid `createRoot()` manually, call `scope.stop()` or `dispose()` when that lifecycle ends.
- Adapters add no scheduling, batching, deferring, or transactions. A framework may defer DOM commits, but the Core value and adapter snapshot update during the synchronous notification.

### Preserve `Object.is` and immutable updates

Core is the only change gate. Repeated `NaN` values do not notify, while `0` and `-0` are distinct. Objects and arrays are compared by reference:

```ts
const todos = atom([{ id: 1, done: false }]);

// Correct: create a new array and a new object.
todos.set((items) => items.map((item) => (item.id === 1 ? { ...item, done: true } : item)));
```

Do not mutate a value in place and return the same reference. An adapter does not add a deep comparison after Core.

### Isolate SSR state per request

Mutable server state belongs to the request lifecycle. Do not share user-specific or request-specific atoms from server module scope:

```ts
import { atom } from "@zhuangtai-js/core";

export function createRequestState(initialCount: number) {
  return {
    count: atom(initialCount),
  };
}
```

Create the state once per request, then pass the same request-owned atoms through that component tree. The client initial value must match the server output during hydration. `@zhuangtai-js/persist` reads `localStorage` by default; on the server, pass explicit synchronous storage or create the persisted atom only on the client.

## Preact

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

`@zhuangtai-js/preact` uses `preact/hooks` and the two-argument `useSyncExternalStore` from `preact/compat`. `useAtomValue` and `useAtom` subscribe to values; `useSetAtom` returns only a stable setter. `createAtomHook` and `createComputedHook` bind a fixed atom into an argument-free hook.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);
  const reset = useSetAtom(countAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}
```

The adapter caches snapshots so a computed that creates a fresh object on each `get()` does not create a read loop. Server rendering uses the same browser-independent snapshot reader and creates no subscription. The application must still create atoms per request and keep hydration state consistent.

## Svelte

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/svelte svelte
```

`toReadable` converts a `ReadableAtom` into a standard `Readable`. `toWritable` converts a writable atom into a standard `Writable`. They work with `$store`, `derived`, `get`, and `readonly` and do not use runes.

```svelte
<script lang="ts">
  import { atom, computed } from "@zhuangtai-js/core";
  import { toReadable, toWritable } from "@zhuangtai-js/svelte";

  const countAtom = atom(0);
  const count = toWritable(countAtom);
  const double = toReadable(computed(() => countAtom.get() * 2));
</script>

<button on:click={() => count.update((value) => value + 1)}>
  {$count} × 2 = {$double}
</button>
```

`$store` lets Svelte own subscription and cleanup. A manual `subscribe` call must be paired with its stopper. The adapter itself uses no browser API, so the SSR boundary comes from the underlying atom: create atoms and stores per request instead of sharing mutable server module instances.

## Vue

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

`useAtomValue` returns a read-only `ComputedRef<Value>`. `useAtom` returns `[ComputedRef<Value>, setter]`, and `useSetAtom` returns only a setter. Read APIs must run inside component `setup()`, `<script setup>`, `effectScope().run()`, or another active effect scope. Without an active scope, they throw synchronously before reading or subscribing.

The adapter uses a shallow snapshot, preserving the exact object and array references held by Core instead of creating deep Vue proxies. `.value` updates synchronously during a Core notification; component DOM rendering still follows Vue's scheduler.

The final Vue SSR boundary is: when `useAtomValue` runs in a `createSSRApp` component `setup()`, the `renderToString` path only reads an `atom.get()` snapshot and does not install a Core watcher or create a subscription. Only read APIs in an active client effect scope subscribe to Core, and the scope cleanup registered with `onScopeDispose` releases them. Do not add a manual `effectScope` solely for component SSR; stop a scope yourself only when you explicitly create a client scope outside the component scope.

```ts
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { useAtomValue } from "@zhuangtai-js/vue";

const requestState = createRequestState(1);
const app = createSSRApp({
  setup() {
    const count = useAtomValue(requestState.count);
    return () => h("span", String(count.value));
  },
});

await renderToString(app); // SSR reads the snapshot without creating a Core subscription.
```

You must still create `requestState` per request. SSR creates no subscription, and client scope cleanup does not isolate a module-level atom.

## Solid

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

`createAtomValue` returns an `Accessor<Value>`. `createAtomSignal` returns `[Accessor<Value>, setter]`, and `createSetAtom` returns only a setter. Client read APIs must run in a component or `createRoot`; without a client owner, they throw synchronously before reading or subscribing. A standard server `renderToString` callback does not require an owner.

```ts
import { createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomSignal } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const owned = createRoot((dispose) => {
  const [count, setCount] = createAtomSignal(countAtom);
  return { count, setCount, dispose };
});

owned.setCount((value) => value + 1);
owned.dispose();
```

The internal signal uses `{ equals: false }`, leaving Core's `Object.is` as the only notification gate and preserving exact function, object, and array references. The server first uses the public `isServer` signal from `solid-js/web`; standard `renderToString(() => createAtomValue(source)...)` reads a snapshot without checking for an owner or creating a Core watcher, and Solid 1.5 needs no manual `createRoot` wrapper. Client component/root owners subscribe to Core and `onCleanup` stops them, while manual client roots must be explicitly disposed. Create independent atoms per request.

## When to use Core directly

An adapter is usually unnecessary when:

- An SDK, data layer, command, event handler, Web Component, or server module does not need framework rendering.
- You only need synchronous `get()` / `set()` / `watch()` and already have a clear manual cleanup boundary.
- You want to reuse one state model across frameworks. Keep Core atoms in a framework-independent module and wrap them only at each UI boundary.

Use an adapter at the UI boundary only when a component needs native subscriptions, automatic cleanup, and template or reactive integration.

## Next steps

- [Preact reference](/en/reference/preact/)
- [Svelte reference](/en/reference/svelte/)
- [Vue reference](/en/reference/vue/)
- [Solid reference](/en/reference/solid/)
- [Integrations and compatibility](/en/integrations/)
