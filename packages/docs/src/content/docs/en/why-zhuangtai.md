---
title: Why ZhuàngTài
sidebar:
  label: Why ZhuàngTài
  order: 2
description: Understand ZhuàngTài's position, differentiators, and boundaries.
---

ZhuàngTài provides **predictable state primitives for JavaScript libraries and applications**. It does not try to be “a smaller Zustand” or “a more capable Jotai.” It turns synchronous, direct, composable state behavior into a small set of foundations that are easy to reason about.

## It does not optimize for API count

```ts
const count = atom(0);

count.watch((value, prevValue) => {
  console.log(prevValue, value);
});

count.set(1);
```

The source order is the runtime order: `watch` runs immediately on registration; `set` applies immediately; callbacks complete synchronously; equality uses `Object.is`. Core has no hidden batching, transactions, debouncing, or scheduler.

## Four reasons to choose it

1. **Direct `get / set / watch`**: no framework lifecycle is required, which also suits SDKs, Web Components, editors, media players, and Canvas tools.
2. **A synchronous derived graph**: `computed` automatically tracks dependencies actually read and does not notify when the derived value is unchanged.
3. **Explicit error semantics**: every watcher is attempted before collected errors are thrown; failures do not silently change call order.
4. **A persistence commit boundary**: Persist writes storage before committing memory, so a failed write never leaves memory ahead of storage.

## When not to choose it

- If you need a mature selector middleware ecosystem, Redux DevTools workflows, or many existing Zustand integrations, evaluate Zustand first.
- If you need asynchronous derived atoms, Suspense, writable derived state, or a broad utilities ecosystem, evaluate Jotai first.
- If you need an official Vue, Svelte, Solid, or React Native adapter, check [integrations and compatibility](/en/integrations/) first; do not treat “Core may work” as “officially supported.”

Continue to the [state model comparison](/en/compare/) and [reproducible benchmarks](/en/benchmarks/) for evidence and limitations.
