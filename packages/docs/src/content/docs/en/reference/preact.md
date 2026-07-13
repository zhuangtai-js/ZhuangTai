---
title: Preact Reference
description: "Hooks, bound hooks, lifecycle, and SSR semantics for @zhuangtai-js/preact."
---

`@zhuangtai-js/preact` uses native Preact hooks and `useSyncExternalStore` from `preact/compat` to connect Core atoms and computeds to components.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/preact preact
```

Peer ranges are `@zhuangtai-js/core ^0.5.0` and Preact `>=10.9 <11`.

## Basic hooks

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const double = useAtomValue(doubleAtom);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}:{double}
    </button>
  );
}

function ResetButton() {
  const setCount = useSetAtom(countAtom);
  return <button onClick={() => setCount(0)}>reset</button>;
}
```

- `useAtomValue(source)` subscribes to a writable atom or computed and returns its current value.
- `useSetAtom(source)` returns a stable setter without reading or subscribing to the value.
- `useAtom(source)` returns `[value, setter]`.

The setter accepts a concrete value or updater and calls Core `set` directly.

## Bound hooks

```tsx
import { createAtomHook, createComputedHook } from "@zhuangtai-js/preact";

const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(doubleAtom);
```

- `createAtomHook(atom)` returns an argument-free hook that yields `[value, setter]`.
- `createComputedHook(source)` returns an argument-free read-only hook that yields the current value.

Each factory returns a stable hook. A setter stays stable for the same atom reference. When a component switches to another atom reference, the old subscription is cleaned up and the new atom is connected.

## Snapshots and lifecycle

The adapter caches a snapshot per hook instance. A computed whose `get()` creates a fresh object or array therefore returns the same snapshot reference between Core notifications.

Core `watch` synchronously emits the current value during subscription. The adapter skips that initial notification when nothing changed. If the value changed between render and subscribe, it notifies Preact immediately so the update is not missed. Preact calls the unsubscribe function when the component unmounts or the atom reference changes.

## Semantics

- Core `Object.is` is the change gate: repeated `NaN` values do not notify, while `0` and `-0` are distinct.
- Objects and arrays are reference-based and require immutable updates.
- The adapter adds no scheduling, batching, deferring, or transactions.
- Errors from Core subscription, setters, or watchers are not replaced.

## SSR

Preact's two-argument `useSyncExternalStore` uses the same browser-independent snapshot reader on the server. Server rendering does not call `watch`, so it creates no subscription.

The application must still create mutable atoms per request and use matching initial state for client hydration. Having zero server subscriptions does not make a module-level mutable atom safe to share across requests.

## When to use Core directly

Use `get`, `set`, and `watch` from `@zhuangtai-js/core` directly in data layers, server logic, event handlers, or SDKs that do not need Preact rendering. Add the Preact adapter only at the component boundary.
