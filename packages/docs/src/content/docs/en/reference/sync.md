---
title: Sync Reference
description: "BroadcastChannel sync, codec options, and cross-context semantics from @zhuangtai-js/sync."
---

`@zhuangtai-js/sync` provides cross-context synchronization for atom creators made with `createAtom()`.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/sync
```

Install `@zhuangtai-js/core` alongside it, because it is a peer dependency of `@zhuangtai-js/sync`.

## Install the plugin

Install `sync` on an atom creator.

```ts
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const atom = createAtom().use(sync);
```

The default `atom()` export is not extended. Only atoms created with this creator accept `sync` options.

## Sync an atom

Pass `sync.key` to sync state across same-origin contexts through `BroadcastChannel`.

```ts
const theme = atom("light", {
  sync: {
    key: "theme",
  },
});

theme.set("dark");
```

## Configure a channel

Synchronization uses a `BroadcastChannel` named after `key` by default. Custom `channel` objects need to implement `postMessage` and `addEventListener("message", ...)`, matching the methods of the same name on `BroadcastChannel`.

```ts
const channel = new BroadcastChannel("count");

const count = atom(0, {
  sync: {
    key: "count",
    channel,
  },
});
```

If `channel` is omitted, the plugin uses `new BroadcastChannel(key)`. Under SSR or a runtime without `BroadcastChannel`, the atom silently degrades to a plain atom with no sync and no error.

## Configure a codec

The default codec uses `JSON.stringify` and `JSON.parse`. It only supports values that `JSON.stringify` returns as a string, and `undefined`, functions, and symbols throw during encode instead of being sent to the channel.

```ts
const count = atom(0, {
  sync: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

## Semantics

- Omitting `sync` options leaves the atom unchanged.
- Updates commit locally and synchronously first, and only after a successful commit is the concrete value broadcast to other contexts.
- Incoming broadcasts are decoded and written straight to the underlying state, so they are not re-broadcast and echo loops are avoided.
- `Object.is` no-op updates are not broadcast.
- Because received broadcasts write straight to the underlying state, they bypass the `set` logic of any other plugin wrapped above `sync`.
- SSR or runtimes without `BroadcastChannel` silently degrade to a plain atom.
- The default `BroadcastChannel` is unref'ed on runtimes that support it, such as Node, so a synced atom never blocks process exit. Sync keeps working for the lifetime of the process, and an explicitly passed `channel` is managed by the caller.
- `BroadcastChannel` only works across same-origin contexts. It does not cross devices and does not persist. Combine it with `@zhuangtai-js/persist` when you need persistence.
- Async channels are not supported.

## Types

`@zhuangtai-js/sync` exports these public types:

```ts
export type SyncCodec = {
  readonly encode: (value: unknown) => string;
  readonly decode: <Value>(rawValue: string, initialValue: Value) => Value;
};

export type SyncMessageEvent = {
  readonly data: string;
};

export type SyncChannel = {
  readonly postMessage: (message: string) => void;
  readonly addEventListener: (type: "message", listener: (event: SyncMessageEvent) => void) => void;
};

export type SyncOptions = {
  readonly key: string;
  readonly channel?: SyncChannel;
  readonly codec?: SyncCodec;
};
```

`SyncOptions.key` is required. `channel` and `codec` are optional.
