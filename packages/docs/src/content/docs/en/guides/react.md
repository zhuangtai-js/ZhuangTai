---
title: Using with React
description: Connect ZhuàngTài atoms to React components, hooks, and StrictMode.
---

`@zhuangtai-js/react` lets you use ZhuàngTài atoms and computeds directly in React. You do not need a provider, and you do not need to move state into React context. The state stays in the atom. Components just subscribe to it.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` is a peer dependency and supports React 18 and React 19.

## The three basic hooks

Use `useAtom()` when a component reads and writes the same writable atom, `useAtomValue()` for read-only access, and `useSetAtom()` when you only need the setter.

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

function ResetButton() {
  const setCount = useSetAtom(countAtom);

  return <button onClick={() => setCount(0)}>reset</button>;
}
```

In this example, `Counter` reads and writes, `Double` only reads a computed value, and `ResetButton` only needs the setter. Each component re-renders only when the atom it watches changes.

## Share state across components without providers

The trick is not a provider. The trick is one shared atom reference. If two components import the same `countAtom`, they are looking at the same state.

```tsx
function App() {
  return (
    <>
      <Counter />
      <Double />
      <ResetButton />
    </>
  );
}
```

You can define the atom at module scope and use it anywhere. There is no extra provider tree to wire up.

## Bind a dedicated hook

If you do not want to pass an atom into every component, bind it into a hook when you create it.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));
```

`createAtomHook()` returns a hook that behaves like `useState()`: it gives you `[value, setter]`. `createComputedHook()` returns a hook that gives you the current value only, with no setter. Use the former for writable stores and the latter for derived values.

## Re-render behavior

This adapter is built on `useSyncExternalStore`. It reuses core's synchronous `get()` and `watch()` directly. The result is straightforward: a component re-renders only when the atom it subscribes to changes.

That also means `useSetAtom()` does not subscribe to the value, so a button that only calls the setter will not re-render on value changes. `useAtomValue()` works for both atoms and computeds, and React does not need to know which one it is.

## Works with React 18/19 StrictMode

`@zhuangtai-js/react` is designed for React 18 and React 19, including StrictMode. Because the core is synchronous, React only handles subscription management around it. It does not change when the atom updates happen.

## Next steps

- Read [Core Concepts](/en/guides/core-concepts/) to understand `watch`, `computed`, and immediate updates.
- Read [React reference](/en/reference/react/) for the full hook and bound-hook API.
