---
title: Why ZhuàngTài
sidebar:
  label: Why ZhuàngTài
  order: 2
description: See how direct, synchronous, type-safe state primitives reduce learning and usage cost.
---

ZhuàngTài provides **predictable state primitives for JavaScript libraries and applications**. Its goal is to keep state code direct: a small, clear API; data flow that follows source order; and capabilities that compose only when needed.

## Data flow you can read at a glance

```ts
const count = atom(0);

count.watch((value, prevValue) => {
  console.log(prevValue, value);
});

count.set(1);
```

Source order is runtime order: `watch` runs immediately on registration; `set` applies immediately; callbacks complete synchronously; equality uses `Object.is`. Core does not hide update timing or introduce implicit scheduling.

## Four core values

1. **Direct `get / set / watch`**: no framework lifecycle is required, which also suits SDKs, Web Components, editors, media players, and Canvas tools.
2. **Automatic derived state**: `computed` tracks the dependencies read by the current evaluation and only notifies when the derived value changes.
3. **TypeScript first**: the public API preserves precise inference so the type system can enforce constraints that are knowable statically.
4. **Capabilities on demand**: React, Persist, Sync, Immer, and Freeze live in separate packages while Core keeps zero third-party runtime dependencies.

## Start with working examples

Try the real React components in [Interactive Examples](/en/playground/), then continue with [Core Concepts](/en/guides/core-concepts/) and [Integrations & Compatibility](/en/integrations/).
