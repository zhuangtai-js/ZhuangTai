---
title: Vue Reference
description: "Computed refs, effect scopes, component lifecycle, and SSR behavior for @zhuangtai-js/vue."
---

`@zhuangtai-js/vue` exposes Core atoms and computeds as read-only Vue `ComputedRef` values while preserving Core's synchronous updates and reference semantics.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/vue vue
```

Peer ranges are `@zhuangtai-js/core ^0.5.0` and Vue `>=3.2 <4`.

## `useAtomValue(source)`

On the client, subscribes to a `ReadableAtom<Value>` and returns a read-only `ComputedRef<Value>`; the Vue SSR path only reads a snapshot and creates no Core subscription.

```ts
import { effectScope } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(0);
const scope = effectScope();

scope.run(() => {
  const count = useAtomValue(countAtom);
  countAtom.set(1);
  console.log(count.value); // 1
});

scope.stop();
```

Read APIs must run in component `setup()`, `<script setup>`, `effectScope().run()`, or another active effect scope. Without an active scope, the function throws synchronously before reading or subscribing.

## `useSetAtom(source)`

Returns a setter that calls Core `set` directly. It neither reads nor subscribes, so it does not require an active effect scope.

```ts
import { useSetAtom } from "@zhuangtai-js/vue";

const setCount = useSetAtom(countAtom);
setCount(1);
setCount((value) => value + 1);
```

## `useAtom(source)`

Returns `[ComputedRef<Value>, setter]`:

```ts
import { useAtom } from "@zhuangtai-js/vue";

const [count, setCount] = useAtom(countAtom);
```

It is equivalent to calling `useAtomValue` and `useSetAtom`, so it requires an active effect scope.

## References and lifecycle

The adapter stores a snapshot in `shallowRef` and returns a read-only computed. Objects and arrays retain the exact reference held by Core instead of becoming deep Vue proxies. Core `watch` closes the read-to-subscribe window with its initial synchronous notification, and later notifications update `.value` synchronously.

The stopper is registered through `onScopeDispose`. Component unmount or effect-scope disposal automatically releases the Core subscription. A manually created `effectScope` still needs an explicit `scope.stop()` from its owner.

## Semantics

- Core `Object.is` is the only change gate. Repeated `NaN` values do not notify, while `0` and `-0` are distinct.
- Objects and arrays are reference-based and require immutable updates.
- The adapter adds no scheduling, batching, deferring, or transactions and does not replace Core or watcher errors.
- `.value` is updated during the synchronous Core notification; Vue component DOM still follows Vue's rendering scheduler.

## SSR

When `useAtomValue` runs inside a `createSSRApp` component `setup()`, the `renderToString` path only reads an `atom.get()` snapshot and does not install a Core watcher or create a subscription. Only read APIs in an active client effect scope subscribe to Core, and the scope cleanup registered with `onScopeDispose` releases them. No extra manual `effectScope` is needed around component SSR.

```ts
import { renderToString } from "@vue/server-renderer";
import { createSSRApp, h } from "vue";
import { atom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/vue";

const countAtom = atom(1); // Create this per request in a real application.
const app = createSSRApp({
  setup() {
    const count = useAtomValue(countAtom);
    return () => h("span", String(count.value));
  },
});

await renderToString(app); // SSR reads the snapshot without creating a Core subscription.
```

SSR creates no subscription; client cleanup solves subscription lifecycle, not state isolation. Create user-specific or request-specific atoms per request instead of sharing mutable server module instances.

## When to use Core directly

Use Core directly in data layers, server logic, or SDKs outside a Vue effect scope when no `ComputedRef` is needed. Setter-only code can also use `useSetAtom` or call atom `set` directly.
