---
title: React reference
description: "Hooks and bound-hook factories for @zhuangtai-js/react."
---

`@zhuangtai-js/react` bridges `@zhuangtai-js/core` atoms and computeds to React. It is built on `useSyncExternalStore` and reuses core's synchronous `watch`/`get` directly, without adding any scheduling.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` is a peer dependency and requires React 18 or later.

## Hooks

Three hooks cover read, write, and read-write. You create the atom outside the component.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";

const countAtom = atom(0);
const doubleAtom = computed(() => countAtom.get() * 2);

function Counter() {
  const [count, setCount] = useAtom(countAtom);

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useAtomValue(doubleAtom);

  return <span>{double}</span>;
}
```

- `useAtomValue(atom)`: subscribes to a `ReadableAtom` (an `Atom` or a `computed`), returns the current value, and re-renders when it changes.
- `useSetAtom(atom)`: returns a stable setter for a writable `Atom` without subscribing to the value. A component that uses only the setter does not re-render when the value changes.
- `useAtom(atom)`: reads and writes a writable `Atom`, like `useState`, returning `[value, setter]`.

## Bound hooks

If you would rather not pass an atom in every component, bind an atom into a hook at creation time. The two factories map one-to-one to core's `atom` / `computed`, so you distinguish writable stores from computed stores when you create the hook.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));

function Counter() {
  const [count, setCount] = useCount();

  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}

function Double() {
  const double = useDouble();

  return <span>{double}</span>;
}
```

- `createAtomHook(atom)`: takes a writable `Atom` and returns a hook that yields `[value, setter]`, like `useState`. Use it for a writable store.
- `createComputedHook(atom)`: takes a `ReadableAtom` (usually a `computed`) and returns a hook that yields the current value only, with no setter. Use it for a computed store.

Pair `createAtomHook` with something you made via `atom(...)`, and `createComputedHook` with something you made via `computed(...)`. The shape returned at the call site is fixed, so you never have to remember which is which.

## Semantics

- Values come from core's `get()` and notifications come from core's `watch()`; both are synchronous.
- Because core is synchronous, `get()` always returns the latest value, so there is no tearing. The server snapshot reuses `get()`, which supports SSR.
- `subscribe` skips the initial watch callback that core fires synchronously on subscribe, notifying React only on real changes.
- The setter and `subscribe` keep a stable identity for the same atom reference; React does not re-subscribe while the atom is unchanged.
- The setter calls `atom.set` directly, so it supports both concrete values and updater functions, matching core's semantics.
