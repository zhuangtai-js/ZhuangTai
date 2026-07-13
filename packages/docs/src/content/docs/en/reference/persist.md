---
title: Persist Reference
description: "Synchronous storage, codecs, version migration, and failure semantics for @zhuangtai-js/persist."
---

`@zhuangtai-js/persist` adds synchronous persistence to an atom creator made with `createAtom()`. Without `version`, it preserves the raw storage format. Adding a version opts into marked records, step-by-step migration, and write-back.

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

## Persistence without a version

```ts
const theme = atom("light", {
  persist: {
    key: "theme",
  },
});

// Encode and write storage first; commit memory only after success.
theme.set("dark");
```

If `storage.getItem(key)` returns `null`, the atom uses its supplied initial value. When `version` is omitted, the codec-produced string is stored as-is, preserving existing unversioned bytes and behavior.

## Versioned persistence

`version` must be a positive safe integer. When versioning is enabled, legacy unmarked data is treated as version 0, and `migrations[n]` migrates version `n` to `n + 1`.

```ts
import { definePersistMigration } from "@zhuangtai-js/persist";

type SettingsV0 = {
  readonly theme: "light" | "dark";
};

type SettingsV1 = SettingsV0 & {
  readonly density: "comfortable" | "compact";
};

type Settings = SettingsV1 & {
  readonly locale: string;
};

function isSettingsV0(value: unknown): value is SettingsV0 {
  return (
    typeof value === "object" &&
    value !== null &&
    "theme" in value &&
    (value.theme === "light" || value.theme === "dark")
  );
}

function isSettingsV1(value: unknown): value is SettingsV1 {
  return (
    isSettingsV0(value) &&
    "density" in value &&
    (value.density === "comfortable" || value.density === "compact")
  );
}

const settings = atom<Settings>(
  { theme: "light", density: "comfortable", locale: "en" },
  {
    persist: {
      key: "settings",
      version: 2,
      migrations: {
        0: definePersistMigration((value) => {
          if (!isSettingsV0(value)) {
            throw new TypeError("Invalid SettingsV0 stored value.");
          }

          return { ...value, density: "comfortable" };
        }),
        1: definePersistMigration((value) => {
          if (!isSettingsV1(value)) {
            throw new TypeError("Invalid SettingsV1 stored value.");
          }

          return { ...value, locale: "en" };
        }),
      },
    },
  },
);
```

Migration runs synchronously during atom creation and advances step by step in version order. Intermediate versions cannot be skipped. Restoring version 0 data to version 2 requires both `migrations[0]` and `migrations[1]`.

## `definePersistMigration<Value>()`

`definePersistMigration<Value>(migration)` is a runtime identity helper, but its callback input is always `unknown` from the storage boundary. The optional `Value` generic only constrains the return value; it cannot make a narrow input type a safe migration input. It does not validate storage content or infer the next step's type.

```ts
const migrateTheme = definePersistMigration((value) => {
  if (!isSettingsV0(value)) {
    throw new TypeError("Invalid SettingsV0 stored value.");
  }

  return { ...value, density: "comfortable" as const };
});
```

Decoded storage remains a trust boundary. If users, older builds, or other programs can modify it, parse, validate, and narrow at runtime in the codec or migration. Do not put a narrow-input function such as `(value: string) => unknown` directly into `migrations`.

## Migration best practices

- Increase `version` only when the serialized shape or interpretation changes.
- Keep every consecutive step that may still be needed by data in user storage.
- Keep each step synchronous, deterministic, and side-effect free. Return new objects or arrays instead of mutating the input.
- Treat the `definePersistMigration` callback input as `unknown` and parse or narrow it to the old shape for that step.
- Do not read UI state, the network, or request-external shared mutable state during migration.
- A custom codec used for legacy migration should decode without depending on the final `initialValue` as a decode target.

## Restore and write-back order

Versioned restore uses this order:

1. Parse a marked record. An unmarked raw string is treated as a version 0 payload.
2. If the record already has the current version, decode it directly without migration or storage rewrite.
3. If the record is older, collect every consecutive step, decode the old payload, and run migrations in order.
4. Encode the migrated value and write the current-version record back to storage first.
5. Only after write-back succeeds, decode the new payload into the final `Value` and create the atom.

A failed migration write-back therefore cannot create a new in-memory version that was never persisted successfully.

## Stored record format

A versioned value uses an exact JSON envelope:

```json
{ "__zhuangtai_persist__": true, "version": 2, "payload": "{\"theme\":\"dark\"}" }
```

A custom codec controls only the `payload` string. The envelope must contain exactly `__zhuangtai_persist__`, `version`, and `payload`. The marker must be `true`, the version must be a positive safe integer, and the payload must be a string.

## Configure storage

The default is `globalThis.localStorage`. You can pass a synchronous Web Storage-style object:

```ts
const values = new Map<string, string>();

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
};
```

`PersistStorage` must implement synchronous `getItem`, `setItem`, and `removeItem`. Async storage is not supported. If `storage` is omitted and reading `globalThis.localStorage` throws, the plugin throws an error that asks for explicit storage and preserves the original error as `cause`.

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

Versioned mode uses the same codec but places only its output in the envelope `payload`.

## Failure semantics

Each of these conditions throws synchronously instead of falling back silently:

- The configured `version` is not a positive safe integer.
- Storage contains a future version newer than the configured target.
- Any migration step from the stored version to the target is missing.
- A marked record is not the exact envelope shape.
- A migration, codec encode/decode operation, or versioned storage write fails.

Migration, codec, and versioned write errors include the key and relevant versions. The original error is preserved as `cause`.

If migration or write-back fails during creation, legacy storage stays unchanged, no atom is created, and final decode does not mutate the caller's initial object. During a normal update, if encode or storage write fails, the in-memory state stays unchanged, watchers are not notified, and the error continues to propagate.

A successful update still follows “encode → storage write → memory commit → synchronous watchers.” If a watcher throws after commit, storage and memory are already updated and are not rolled back. An `Object.is` no-op update does not write storage.

## Public types

- `PersistOptions`
- `PersistStorage`
- `PersistCodec`
- `PersistMigration`

At runtime, a `PersistMigration` receives and returns boundary data of unknown shape; its public input type is `(value: unknown) => unknown`. `definePersistMigration` does not change that input boundary. It only provides an identity wrapper and can use `Value` to constrain the return value.
