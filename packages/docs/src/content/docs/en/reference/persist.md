---
title: Persist Reference
description: "Synchronous and asynchronous storage, hydration, lifecycle controls, codecs, version migration, and failure semantics for @zhuangtai-js/persist."
---

`@zhuangtai-js/persist` adds persistence to an atom creator made with `createAtom()`. It supports synchronous storage and generic storage methods that return either plain values or `PromiseLike` values; Core `set` and `watch` remain synchronous.

## Install

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/persist
```

## Install the plugin

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const atom = createAtom().use(persist);
```

The default Core `atom()` export does not accept plugin options. Only atoms created by this creator accept `persist`.

## Synchronous and asynchronous storage

`PersistStorage` is a structural contract and is not tied to a storage library or runtime. Each call to `getItem`, `setItem`, and `removeItem` may return either a plain value or a `PromiseLike` value:

```ts
import type { PersistStorage } from "@zhuangtai-js/persist";

const values = new Map<string, string>();

const storage: PersistStorage = {
  getItem: (key) => Promise.resolve(values.get(key) ?? null),
  setItem: (key, value) =>
    Promise.resolve().then(() => {
      values.set(key, value);
    }),
  removeItem: (key) =>
    Promise.resolve().then(() => {
      values.delete(key);
    }),
};
```

The plugin detects thenables from each call, so one storage object may mix synchronous and asynchronous methods.

| Scenario                                    | Behavior                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `getItem` returns a plain value             | Restoration completes before the atom creator returns; updates keep the “encode → write → memory commit → synchronous watcher” order.       |
| `getItem` returns a thenable                | The atom is created immediately with `initialValue`, then hydrated asynchronously; `persist.ready(atom)` waits for the current hydration.   |
| `setItem` / `removeItem` returns a thenable | `set` and `watch` remain synchronous; writes are queued in call order, and failures are observable through `onError` and `persist.flush()`. |

An asynchronous `set()` does not wait for a Promise. It encodes the new value, queues the storage write, then synchronously commits memory and notifies watchers. An encode failure, or a `setItem` throw inside the original synchronous `set()` call, fails closed synchronously: memory is not committed and watchers are not notified. If the write is placed behind existing asynchronous work, `setItem` is not invoked until the queue runs it; a throw at that point is a queued deferred failure relative to the original `set()`, so the local memory commit remains and `onError` plus `flush()` report it.

## Lifecycle controller

`persist` exports a plugin object with lifecycle controller methods:

```ts
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";

const state = createAtom().use(persist)(0, {
  persist: { key: "count" },
});

await persist.ready(state);
await persist.flush(state);
await persist.rehydrate(state);
await persist.clear(state);
```

- `ready(atom)` waits for the latest hydration generation. It rejects when reading, migration, or migration write-back fails.
- `flush(atom)` waits for hydration, controller operations, and queued writes. It rejects with the first retained failure and then clears that batch.
- `rehydrate(atom)` returns a lifecycle Promise and starts a new read generation; late results from an older generation cannot overwrite the newer result. Even if its internal `getItem` throws synchronously, the returned Promise rejects.
- If a local update happens during hydration, the local value wins; the latest local value is written after the read completes.
- `clear(atom)` returns a lifecycle Promise, waits for hydration and queued writes, then calls `removeItem`. Even if the internal `removeItem` throws synchronously, the returned Promise rejects. It does not reset the atom's in-memory value.
- Calling controller methods with an atom not created by this plugin throws a `TypeError`.

Asynchronous writes are serialized in logical local `set()` order. One rejected write does not stop later writes; failures remain until the next `flush()`, and each failed operation can be reported once through that atom's `onError` callback.

## SSR and hydration

The default storage is `globalThis.localStorage`. When SSR has no usable `localStorage`, pass a storage explicitly owned by the request or client, or create the persisted atom only on the client.

Asynchronous storage starts from `initialValue` until hydration finishes. For stable SSR output, let server and client start from the same initial state, then show restored content on the client after `persist.ready(atom)`; do not read browser-only storage during server rendering.

## Persistence without a version

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

theme.set("dark");
```

If `storage.getItem(key)` returns `null`, the atom uses its supplied initial value. When `version` is omitted, the codec-produced string is stored as-is, preserving existing unversioned bytes and behavior.

Synchronous storage updates follow encode → storage write → memory commit → synchronous watcher. An `Object.is` no-op does not write storage; if writing fails, the in-memory state stays unchanged and watchers are not notified.

## Versioned persistence and migration

`version` must be a positive safe integer. When versioning is enabled, legacy unmarked data is treated as version 0, and `migrations[n]` migrates version `n` to `n + 1`.

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = { readonly theme: "light" | "dark" };
type Settings = SettingsV0 & { readonly density: "comfortable" | "compact" };

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    (value.theme === "light" || value.theme === "dark")
  );
}

const settings = atom<Settings>(
  { theme: "light", density: "comfortable" },
  {
    persist: {
      key: "settings",
      version: 1,
      migrations: {
        0: definePersistMigration((value) => {
          if (!isSettingsV0(value)) {
            throw new TypeError("Invalid SettingsV0 stored value.");
          }

          return { ...value, density: "comfortable" };
        }),
      },
    },
  },
);
```

Migration callbacks remain synchronous, deterministic, and side-effect free, running step by step in version order; asynchronous storage only makes reads and write-back asynchronous. Intermediate versions cannot be skipped: restoring version 0 data to version 2 requires both `migrations[0]` and `migrations[1]`.

During asynchronous hydration, the plugin completes migration write-back before committing the migrated in-memory value and resolving `ready`. If a local update wins during hydration or migration, stale migration data is not applied or written back; the latest local value is written instead. A current-version record is restored directly without migration or rewriting.

`PersistMigration` receives data from the storage boundary as `unknown`. Parse or narrow the old shape in every step; do not put a narrow-input function such as `(value: string) => unknown` directly into `migrations`. `definePersistMigration<Value>` is an identity helper: it keeps the `unknown` input boundary and only uses `Value` to constrain the return value.

## Migration best practices

- Add a `version` only when the serialized shape or interpretation changes.
- Keep every consecutive migration step that may still be needed by data in user storage.
- Keep each step synchronous, deterministic, and side-effect free; return new objects or arrays instead of mutating the input.
- Treat `definePersistMigration` input as `unknown` and parse or narrow it to that step's old shape.
- Do not read UI state, the network, or request-external shared state during migration.
- A custom codec used for legacy migration should work without the final `initialValue` as a decode target.

## Restore and write-back order

Versioned restore follows this order:

1. Parse a marked record. An unmarked raw string is treated as a version 0 payload.
2. If the record already has the current version, decode it directly without migration or storage rewriting.
3. If the record is older, collect every consecutive step, decode the old payload, and run migrations in order.
4. Encode the migrated result and write the current-version record back to storage.
5. Only after write-back succeeds, decode the new payload into the final `Value` and create or update the atom.

A failed migration write-back therefore cannot commit a new version that exists only in memory. With asynchronous storage, `ready` rejects and the failure reaches `onError` and `flush`.

## Stored record format

A versioned record is an exact JSON envelope:

```json
{ "__zhuangtai_persist__": true, "version": 2, "payload": "{\"theme\":\"dark\"}" }
```

A custom codec controls only the `payload` string. The envelope must contain exactly `__zhuangtai_persist__`, `version`, and `payload`; the marker must be `true`, the version must be a positive safe integer, and the payload must be a string.

## Configure a codec

The default codec uses `JSON.stringify` / `JSON.parse` and rejects non-finite numbers and invalid `Date` values before encode so JSON cannot silently turn them into `null`. Top-level `undefined`, functions, and symbols also cannot be encoded.

```ts
const count = atom(0, {
  persist: {
    key: "count",
    codec: {
      encode: (value) => String(value),
      decode: (rawValue) => Number(rawValue),
    },
  },
});
```

## Failure semantics

The call boundary where a failure occurs determines whether it throws synchronously or rejects the corresponding Promise; the plugin does not silently fall back:

- The configured `version` is not a positive safe integer.
- Storage contains a future version newer than the configured target.
- Any migration step from the stored version to the target is missing.
- A marked record is not the exact envelope shape.
- A migration, codec encode/decode, or storage read, write, or removal fails.

Failures include package, operation, key, and relevant version context; the original error is preserved in `cause`. `onError` runs once for each failed asynchronous hydration, asynchronous or queued write, migration write-back, `rehydrate`, or `clear` operation. A throw inside the original synchronous creator or local `set()` call propagates directly and does not go through `onError`. `flush` waits for queued work, exposes the first retained failure, and then clears that batch.

A synchronous `getItem`, restoration, migration, or migration write-back failure inside the atom creator fails closed synchronously: legacy storage stays unchanged and no atom is returned. During a local `set()`, an encode failure or a synchronous throw from the immediately invoked `setItem` also fails closed synchronously: memory stays unchanged and watchers are not notified.

`rehydrate()` and `clear()` are always lifecycle Promises. Even when their internal `getItem` or `removeItem` throws synchronously, the returned Promise rejects and `onError` records the failure. If a `setItem` is placed behind existing asynchronous work, either a synchronous throw when the queue invokes it or a Promise rejection is a queued deferred write error: the memory value already committed by the original `set()` remains, `onError` and the next `flush()` expose the error, and later writes continue.

## Public types

- `MaybePromise<Value>`
- `PersistOptions`
- `PersistStorage`
- `PersistControls`
- `PersistCodec`
- `PersistMigration`

`PersistControls` provides `ready`, `flush`, `rehydrate`, and `clear`. All three `PersistStorage` methods use `MaybePromise`, so both synchronous implementations and implementations returning `PromiseLike` values are accepted.
