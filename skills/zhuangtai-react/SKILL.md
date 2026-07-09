---
name: zhuangtai-react
description: Use this skill for `@zhuangtai-js/react`, `useAtom`, `useAtomValue`, `useSetAtom`, `createAtomHook`, and `createComputedHook`. Trigger it when bridging ZhuàngTài atoms and computeds into React, wiring component subscriptions, or checking React adapter semantics for `@zhuangtai-js/core` state.
---

# ZhuàngTài React

Use this skill for the React adapter in `@zhuangtai-js/react`.

Docs: https://zhuangtai.yojigen.cn

Full context: https://zhuangtai.yojigen.cn/llms-full.txt

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react react
# npm i @zhuangtai-js/core @zhuangtai-js/react react
# yarn add @zhuangtai-js/core @zhuangtai-js/react react
```

`react` is a peer dependency and requires React 18 or later.

## What it covers

The adapter bridges `@zhuangtai-js/core` atoms and computeds into React through `useSyncExternalStore`.

It reuses core `get()` and `watch()` directly, so reads stay synchronous and there is no extra scheduling layer.

## Hooks

Use the exact hook names exported by `@zhuangtai-js/react`:

- `useAtom(atom)` returns `[value, setter]` for writable atoms.
- `useAtomValue(atom)` returns the current value of a `ReadableAtom`, including `computed`.
- `useSetAtom(atom)` returns a stable setter without subscribing to the value.

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

## Subscription patterns

- Use `useAtomValue` for read-only display components.
- Use `useSetAtom` when a component only needs to write.
- Use `useAtom` when a component both reads and writes.
- Use `createAtomHook(atom)` to bind a writable atom once and reuse the hook.
- Use `createComputedHook(atom)` to bind a readable atom or computed once and reuse the hook.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook } from "@zhuangtai-js/react";

const countAtom = atom(0);
const useCount = createAtomHook(countAtom);
const useDouble = createComputedHook(computed(() => countAtom.get() * 2));
```

## React behavior

- Core state is synchronous, so React reads always see the latest value.
- The server snapshot reuses `get()`, which supports SSR.
- `subscribe` skips the initial synchronous watcher callback from core and only notifies React on real changes.
- Setter and subscription identities stay stable for the same atom reference.
- The setter calls `atom.set` directly, so it accepts both concrete values and updater functions.
- Because the adapter uses `useSyncExternalStore`, it matches React 18+ external-store patterns and is safe for StrictMode-style subscription lifecycles.
- `@zhuangtai-js/core` stays framework-agnostic, and the React adapter lives in a separate package.

## Common mistakes

- Importing React hooks from core instead of `@zhuangtai-js/react`.
- Using `useAtomValue` on a writable atom when you need a setter too.
- Expecting the adapter to add batching or async scheduling. It does not.
- Forgetting that `react` is a peer dependency.
