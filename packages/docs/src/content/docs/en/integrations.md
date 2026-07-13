---
title: Integrations and Compatibility
sidebar:
  label: Integrations & Compatibility
  order: 6
description: Understand ZhuàngTài Core, official framework adapters, peer ranges, and SSR boundaries.
---

`@zhuangtai-js/core` is independent of UI frameworks. Plain JavaScript, SDKs, server modules, and shared data layers can use Core directly. Add an adapter only at a UI boundary that needs native subscriptions and automatic cleanup.

## Environments and recommended entrypoints

| Environment               | Recommended entrypoint | Notes                                                               |
| ------------------------- | ---------------------- | ------------------------------------------------------------------- |
| Vanilla ESM / Node.js ESM | `@zhuangtai-js/core`   | Use `atom`, `computed`, `get`, `set`, and `watch` directly          |
| React                     | `@zhuangtai-js/react`  | `useAtomValue`, `useSetAtom`, `useAtom`, and bound hooks            |
| Preact                    | `@zhuangtai-js/preact` | Preact hooks and `useSyncExternalStore` from `preact/compat`        |
| Svelte                    | `@zhuangtai-js/svelte` | Standard `svelte/store` objects from `toReadable` and `toWritable`  |
| Vue                       | `@zhuangtai-js/vue`    | Read-only `ComputedRef` values, setters, and effect-scope cleanup   |
| Solid                     | `@zhuangtai-js/solid`  | `Accessor` values, setters, client owner cleanup, and SSR snapshots |
| CommonJS projects         | Import through ESM     | Published packages are ESM-only; use `import`                       |

Read [Framework Adapter Best Practices](/en/guides/framework-adapters/) for complete lifecycle and SSR guidance.

## Current compatibility matrix

These release lines and peer ranges match the package manifests. A 0.x package does not automatically accept an undeclared future Core minor or framework major.

| Package release line          | `@zhuangtai-js/core` | Other peers                       |
| ----------------------------- | -------------------- | --------------------------------- |
| `@zhuangtai-js/freeze@0.2.x`  | `^0.5.0`             | —                                 |
| `@zhuangtai-js/immer@0.2.x`   | `^0.5.0`             | — (Immer is a regular dependency) |
| `@zhuangtai-js/persist@0.4.x` | `^0.5.0`             | —                                 |
| `@zhuangtai-js/preact@0.1.x`  | `^0.5.0`             | Preact `>=10.9 <11`               |
| `@zhuangtai-js/react@0.2.x`   | `^0.5.0`             | React `>=18 <20`                  |
| `@zhuangtai-js/solid@0.1.x`   | `^0.5.0`             | Solid `>=1.5 <2`                  |
| `@zhuangtai-js/svelte@0.1.x`  | `^0.5.0`             | Svelte `>=4.2 <6`                 |
| `@zhuangtai-js/sync@0.2.x`    | `^0.5.0`             | —                                 |
| `@zhuangtai-js/vue@0.1.x`     | `^0.5.0`             | Vue `>=3.2 <4`                    |

The current Core release line is `@zhuangtai-js/core@0.5.x`. Plugin and adapter versions are independent and do not need to share one version number.

## SSR and request isolation

Every server-rendered environment must decide which lifecycle owns each atom:

- Create mutable request-specific or user-specific atoms per request instead of sharing server module instances.
- Use client hydration state that matches the server output.
- Preact SSR reads a snapshot without creating a Core subscription.
- The Svelte adapter uses the standard store contract; isolation depends on where the underlying atom is created.
- Vue SSR `renderToString` only reads an `atom.get()` snapshot and does not install a Core watcher; only read APIs in an active client effect scope subscribe, and scope cleanup releases them.
- Standard Solid SSR reads only a snapshot through the public `isServer` signal, requires no owner, and creates no Core watcher. Client subscriptions bind to an owner, and manually created client roots must be explicitly disposed.
- `@zhuangtai-js/persist` reads `localStorage` by default. Server code should pass explicit synchronous storage or create the persisted atom only on the client.

Subscription cleanup and state isolation are separate concerns. Automatically stopping a watcher does not prevent a module-level atom from sharing values across requests.

## Core and adapter boundaries

Keep the state model in a framework-independent module and wrap it with different adapters at different UI boundaries. Core `Object.is`, synchronous `watch`, and reference semantics do not change across frameworks; objects and arrays still require immutable updates.

When code does not need a template, component rendering, or framework-owned cleanup, use Core directly instead of adding a reactive wrapper.
