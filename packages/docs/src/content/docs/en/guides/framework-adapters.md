---
title: Choose a framework adapter
description: Choose the ZhuàngTài adapter for React, Preact, Vue, Svelte, or Solid, or use the React adapter in React Native / Expo.
---

Choose a ZhuàngTài framework adapter when a component needs native subscriptions, reactive reads, and lifecycle cleanup; otherwise use `@zhuangtai-js/core` directly.

## Choose an install target

- **Use Core directly**: state lives in an SDK, data layer, command, event handler, or server module without a framework rendering lifecycle.
- **Use a framework adapter**: a component should update when an atom changes and let the framework own subscription and cleanup.
- **Keep one state model**: put `atom` and `computed` in a framework-independent state module, and connect an adapter only at the UI boundary.

Every adapter requires `@zhuangtai-js/core ^0.5.0`. Adapters add no batching, deferring, transactions, or second equality check; Core applies `set` immediately, runs `watch` synchronously, and uses `Object.is` for equality.

## Shared principles

### Choose access by component responsibility

- **Read-only**: use a read-only API such as `useAtomValue`, `toReadable`, or `createAtomValue` for derived display values.
- **Setter-only**: use a setter-only API for command buttons so they do not create an unnecessary subscription.
- **Read-write**: use a read-write API for forms or counters that need both the current value and an updater.

### Update objects and arrays immutably

Core compares objects and arrays by reference. Do not mutate a value in place and pass the same reference back; use object spread, a new array, or `map` to return a new value:

```ts
counterAtom.set((state) => ({
  ...state,
  history: [...state.history, state.count + 1],
}));
```

### Let the framework own lifecycle

Use the cleanup boundary provided by a component, hook, store, effect scope, or owner. When subscribing manually, keep the stopper; when creating a Vue `effectScope()` or Solid `createRoot()` manually, call `scope.stop()` or `dispose()` at the boundary. Create independent mutable atoms/stores per SSR request and never share mutable server module-scope state.

## Framework cards

### React

Use `useAtomValue`, `useSetAtom`, and `useAtom` from `@zhuangtai-js/react`; it bridges Core through React's `useSyncExternalStore`. Start with the [React quick start](/en/guides/react/), then see the [React reference](/en/reference/react/).

### React Native / Expo

React Native / Expo uses the same `@zhuangtai-js/react` directly, with no Provider or native-specific adapter. The React peer range describes compatibility; it does not claim that every native renderer is independently tested. Open the [React Native / Expo guide](/en/guides/react-native-expo/) for native UI and AsyncStorage persistence.

### Preact

Use the native hooks and `preact/compat` snapshot bridge from `@zhuangtai-js/preact`. Start with the [Preact quick start](/en/guides/preact/), then see the [Preact reference](/en/reference/preact/).

### Vue

Use `useAtomValue`, `useSetAtom`, and `useAtom` from `@zhuangtai-js/vue`; call read APIs from `setup()` or an active effect scope. Start with the [Vue quick start](/en/guides/vue/), then see the [Vue reference](/en/reference/vue/).

### Svelte

Use `toReadable` and `toWritable` from `@zhuangtai-js/svelte` to create standard `svelte/store` values. Start with the [Svelte quick start](/en/guides/svelte/), then see the [Svelte reference](/en/reference/svelte/).

### Solid

Use `createAtomValue`, `createSetAtom`, and `createAtomSignal` from `@zhuangtai-js/solid`; client reads bind to the current owner. Start with the [Solid quick start](/en/guides/solid/), then see the [Solid reference](/en/reference/solid/).

## Quick comparison

| Framework           | Package                | Read-only         | Setter-only     | Read-write         | Lifecycle boundary       |
| ------------------- | ---------------------- | ----------------- | --------------- | ------------------ | ------------------------ |
| React               | `@zhuangtai-js/react`  | `useAtomValue`    | `useSetAtom`    | `useAtom`          | React component          |
| React Native / Expo | `@zhuangtai-js/react`  | `useAtomValue`    | `useSetAtom`    | `useAtom`          | React Native component   |
| Preact              | `@zhuangtai-js/preact` | `useAtomValue`    | `useSetAtom`    | `useAtom`          | Preact component         |
| Vue                 | `@zhuangtai-js/vue`    | `useAtomValue`    | `useSetAtom`    | `useAtom`          | effect scope / component |
| Svelte              | `@zhuangtai-js/svelte` | `toReadable`      | `atom.set`      | `toWritable`       | store subscription       |
| Solid               | `@zhuangtai-js/solid`  | `createAtomValue` | `createSetAtom` | `createAtomSignal` | owner / `createRoot`     |

## Next steps

- Choose a [framework quick start](/en/guides/react/), copy the minimal counter, and replace its state module with your own.
- Return to [Core Concepts](/en/guides/core-concepts/) for synchronous `get`, `set`, `watch`, and `computed`.
- When state must be restored after a reload, read the [Persist reference](/en/reference/persist/).
