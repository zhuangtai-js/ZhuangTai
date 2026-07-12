---
title: Choosing the Right State Model
sidebar:
  label: State Model Comparison
  order: 5
description: An honest comparison of ZhuàngTài, Zustand, and Jotai models, capabilities, and use cases.
---

This is not a ranking where one library wins every dimension. The three libraries optimize different models, and the right choice depends on your constraints.

| Concern              | ZhuàngTài                                                  | Zustand                             | Jotai                                                     |
| -------------------- | ---------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Base model           | `get / set / watch` state primitives                       | Store plus selectors                | Atom graph                                                |
| Default subscription | Runs immediately and receives next/previous values         | Does not run immediately by default | Does not run immediately; read with `get` in the callback |
| Derived state        | Synchronous `computed` with automatic actual-read tracking | Usually selectors                   | Mature derived atoms with async/writable support          |
| Scheduling semantics | No hidden scheduling in Core                               | Direct store updates                | Atom store coordinates dependency updates                 |
| React                | Separate adapter for React 18/19                           | Mature integrated experience        | Mature integrated experience and Suspense ecosystem       |
| Persistence failure  | Write before commit; memory stays unchanged on failure     | Memory is usually already updated   | Memory is usually already updated                         |

## Bundle size and microbenchmarks are not ZhuàngTài's advantage story

In the current pinned-version measurements with the same esbuild configuration, Zustand's minimal entry is smaller than ZhuàngTài and its primitive update microbenchmark is faster. ZhuàngTài is much smaller than the measured minimal Jotai scenario and has lower overhead in that synchronous numeric update microbenchmark, but this is not an application performance conclusion.

We therefore do not claim “smaller than Zustand” or “faster than Zustand.” ZhuàngTài differentiates through a predictable synchronous contract, dynamic `computed`, explicit error semantics, and Persist's write-before-commit boundary. See [benchmarks](/en/benchmarks/) for complete data, pinned versions, and reproduction commands.

## Quick choice

- You are building an SDK, library, Web Component, editor, media player, or Canvas tool and want state independent of the UI framework: choose ZhuàngTài.
- You need a mature store/selector model, middleware, and ecosystem integrations: choose Zustand.
- You need async derivation, Suspense, writable derived atoms, or rich utilities: choose Jotai.
- You only have local component state: start with the framework's built-in state; you may not need an external library.
