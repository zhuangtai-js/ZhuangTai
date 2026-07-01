---
title: ZhuàngTài State
description: Simple, direct state primitives for JavaScript.
template: splash
hero:
  title: ZhuàngTài State
  tagline: Simple, direct state primitives for JavaScript. Manage state with small, synchronous, predictable primitives without hidden scheduling in the core.
  actions:
    - text: Getting Started
      link: /en/getting-started/
      icon: right-arrow
      variant: primary
    - text: View on GitHub
      link: https://github.com/zhuangtai-js/ZhuangTai
      icon: external
      variant: minimal
---

ZhuàngTài is for JavaScript and TypeScript projects that need clear state semantics. The core package provides only `atom`, `computed`, and the plugin entrypoint; framework adapters and persistence live in separate packages.

## Why ZhuàngTài?

- **Synchronous by default.** `set()` updates immediately and `watch()` runs synchronously. There is no hidden batching or delayed scheduling.
- **Small and explicit.** `@zhuangtai-js/core` has no third-party runtime dependencies and keeps the core API small.
- **Composable.** Install plugins with `createAtom()`. The default `atom()` export stays clean and unextended.
- **Good as a low-level primitive.** Use it directly, or build framework adapters and domain state layers on top of it.

## Install

```sh
pnpm add @zhuangtai-js/core
```

Install the persistence plugin only when you need it:

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Start here

- [Getting Started](/en/getting-started/): install, create state, watch changes, and add persistence.
- [Core Reference](/en/reference/core/): read about `atom()`, `computed()`, `createAtom()`, and core types.
- [Persist Reference](/en/reference/persist/): read about the persistence plugin, storage, and codec options.

## Packages

- `@zhuangtai-js/core`: framework-agnostic state core.
- `@zhuangtai-js/persist`: synchronous persistence for atoms created with `createAtom()`.

Future framework adapters will be published as separate packages.
