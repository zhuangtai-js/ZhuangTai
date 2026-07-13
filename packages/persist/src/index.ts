import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  NextValue,
} from "@zhuangtai-js/core";
import type { PersistCodec, PersistOptions, PersistStorage } from "./types.js";
import {
  assertPersistVersion,
  encodeVersioned,
  restoreVersioned,
  writeEncodedVersioned,
} from "./versioned.js";

export { definePersistMigration } from "./types.js";
export type { PersistCodec, PersistMigration, PersistOptions, PersistStorage } from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";

export const persist: AtomCreatorPlugin<"persist", PersistOptions> = {
  id: "persist",
  create: createPersistedAtom,
};

function createPersistedAtom<Value>(
  context: AtomCreatorPluginContext<Value, PersistOptions>,
): Atom<Value> {
  const options = context.options;

  if (options === undefined) {
    return context.next(context.initialValue);
  }

  if (options.version !== undefined) {
    assertPersistVersion(options.version, options.key);
  }

  const storage = resolveStorage(options.storage);
  const codec = options.codec ?? jsonCodec;
  const storedValue = storage.getItem(options.key);

  if (options.version === undefined) {
    const initialValue =
      storedValue === null
        ? context.initialValue
        : decodeStored(codec, storedValue, context.initialValue, options.key);
    const state = context.next(initialValue);

    return persistAtom({
      state,
      storage,
      key: options.key,
      encode(value) {
        return codec.encode(value);
      },
    });
  }

  const initialValue =
    storedValue === null
      ? context.initialValue
      : restoreVersioned({
          rawValue: storedValue,
          initialValue: context.initialValue,
          key: options.key,
          version: options.version,
          migrations: options.migrations,
          storage,
          codec,
        });
  const state = context.next(initialValue);
  const version = options.version;

  return persistAtom({
    state,
    key: options.key,
    storage,
    encode(value) {
      return encodeVersioned(codec, value, options.key, version);
    },
    write(encodedValue) {
      writeEncodedVersioned(storage, options.key, version, encodedValue);
    },
  });
}

function decodeStored<Value>(
  codec: PersistCodec,
  rawValue: string,
  initialValue: Value,
  key: string,
): Value {
  try {
    return codec.decode(rawValue, initialValue);
  } catch (error) {
    throw new Error(`[${PACKAGE_NAME}] Failed to decode the stored value for key "${key}".`, {
      cause: error,
    });
  }
}

type PersistAtomParams<Value> = {
  readonly state: Atom<Value>;
  readonly storage: PersistStorage;
  readonly encode: (value: Value) => string;
  readonly key: string;
  readonly write?: (encodedValue: string) => void;
};

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

function persistAtom<Value>({
  state,
  storage,
  encode,
  key,
  write,
}: PersistAtomParams<Value>): Atom<Value> {
  function set(nextValue: NextValue<Value>): void {
    const prevValue = state.get();
    const value = isUpdater(nextValue) ? nextValue(prevValue) : nextValue;

    if (Object.is(value, prevValue)) {
      return;
    }

    const encodedValue = encode(value);

    if (write === undefined) {
      storage.setItem(key, encodedValue);
    } else {
      write(encodedValue);
    }

    state.set(value);
  }

  return { get: state.get, set, watch: state.watch };
}

function resolveStorage(storage: PersistStorage | undefined): PersistStorage {
  if (storage !== undefined) {
    return storage;
  }

  let localStorage: PersistStorage | undefined;
  try {
    localStorage = globalThis.localStorage;
  } catch (error) {
    throw new Error(
      `[${PACKAGE_NAME}] Reading globalThis.localStorage threw. Pass an explicit storage option instead.`,
      { cause: error },
    );
  }

  if (localStorage === undefined) {
    throw new Error(
      `[${PACKAGE_NAME}] No persist storage was provided, and globalThis.localStorage is unavailable.`,
    );
  }

  return localStorage;
}

const jsonCodec: PersistCodec = {
  encode(value) {
    return encodeDefaultJson(value, PACKAGE_NAME);
  },
  decode(rawValue) {
    return JSON.parse(rawValue);
  },
};

function encodeDefaultJson(value: unknown, packageName: string): string {
  assertDefaultJsonEncodable(value, packageName);

  const encodedValue = JSON.stringify(value);

  if (typeof encodedValue !== "string") {
    throw new TypeError(
      `[${packageName}] The default JSON codec can only encode JSON-serializable values.`,
    );
  }

  return encodedValue;
}

function assertDefaultJsonEncodable(
  value: unknown,
  packageName: string,
  seen: Set<object> = new Set(),
): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(
      `[${packageName}] The default JSON codec cannot encode non-finite numbers (NaN or ±Infinity). Use a custom codec if you need those values.`,
    );
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new TypeError(
        `[${packageName}] The default JSON codec cannot encode invalid Date values. Use a custom codec if you need those values.`,
      );
    }

    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      assertDefaultJsonEncodable(item, packageName, seen);
    }

    return;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      continue;
    }

    assertDefaultJsonEncodable(Reflect.get(value, key), packageName, seen);
  }
}
