---
title: Solid Reference
description: "Accessors, owner lifecycle, reference semantics, and server boundaries for @zhuangtai-js/solid."
---

`@zhuangtai-js/solid` converts Core atoms and computeds into Solid accessors. Client subscriptions bind to the current owner, while standard server rendering returns only a snapshot.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/solid solid-js
```

Peer ranges are `@zhuangtai-js/core ^0.5.0` and Solid `>=1.5 <2`.

## `createAtomValue(source)`

Converts a `ReadableAtom<Value>` into an `Accessor<Value>`. The client subscribes to Core, while the server returns a one-time snapshot.

```ts
import { createRoot } from "solid-js";
import { atom } from "@zhuangtai-js/core";
import { createAtomValue } from "@zhuangtai-js/solid";

const countAtom = atom(0);
const owned = createRoot((dispose) => ({
  count: createAtomValue(countAtom),
  dispose,
}));

countAtom.set(1);
console.log(owned.count()); // 1
owned.dispose();
```

Client read APIs must run in a component or `createRoot`. Without a client owner, the function throws synchronously before reading or subscribing; a standard server `renderToString` callback does not require an owner.

## `createSetAtom(source)`

Returns a setter that calls Core `set` directly. It neither reads nor subscribes, so it does not require an owner.

```ts
import { createSetAtom } from "@zhuangtai-js/solid";

const setCount = createSetAtom(countAtom);
setCount(1);
setCount((value) => value + 1);
```

## `createAtomSignal(source)`

Returns `[Accessor<Value>, setter]`:

```ts
import { createAtomSignal } from "@zhuangtai-js/solid";

const [count, setCount] = createAtomSignal(countAtom);
```

It is equivalent to calling `createAtomValue` and `createSetAtom`. It requires an owner on the client; standard server rendering does not require a manually created owner.

## Owners and reference semantics

In a client component or root owner, the adapter registers the Core stopper through `onCleanup`, and disposal stops the subscription. A manual client `createRoot` must keep and call its `dispose` function. The `renderToString` server path uses the public `isServer` signal from `solid-js/web` to read a snapshot before checking for an owner, creates no Core watcher, and does not rely on SSR cleanup.

The internal signal uses `{ equals: false }`, so Solid does not add a second equality check. Core `Object.is` alone decides whether a notification occurs. The adapter writes through a function wrapper so function values are stored instead of being executed as Solid setter updaters. Objects, arrays, and functions retain their exact references and are neither copied nor proxied.

## Semantics

- Core `watch` closes the read-to-subscribe window with its initial synchronous notification. The adapter skips a duplicate signal write when the value did not change.
- Repeated `NaN` values do not notify, while `0` and `-0` are distinct.
- Objects and arrays are reference-based and require immutable updates.
- The adapter adds no scheduling, batching, deferring, or transactions and does not replace errors.

## SSR

The standard Solid `renderToString(() => createAtomValue(source)...)` path reads one snapshot without requiring an owner in the callback and creates no Core watcher. Solid 1.5 does not need a manual `createRoot` compatibility wrapper. Client component/root owners still subscribe to Core and `onCleanup` stops them; manually created client roots must be explicitly disposed. Create independent atoms per request; cleanup does not isolate mutable server module state automatically.

## When to use Core directly

Use Core directly in services, SDKs, server logic, or commands outside an owner when Solid dependency tracking is unnecessary. Write-only code can use `createSetAtom` or call atom `set` directly.
