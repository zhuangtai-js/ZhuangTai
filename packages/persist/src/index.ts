import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  NextValue,
} from "@zhuangtai-js/core";

export type PersistStorage = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
};

export type PersistCodec = {
  readonly encode: (value: unknown) => string;
  readonly decode: <Value>(rawValue: string, initialValue: Value) => Value;
};

export type PersistOptions = {
  readonly key: string;
  readonly storage?: PersistStorage;
  readonly codec?: PersistCodec;
};

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

  const storage = resolveStorage(options.storage);
  const codec = options.codec ?? jsonCodec;
  const storedValue = storage.getItem(options.key);
  const initialValue =
    storedValue === null
      ? context.initialValue
      : decodeStored(codec, storedValue, context.initialValue, options.key);
  const state = context.next(initialValue);

  return persistAtom({ state, storage, codec, key: options.key });
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
    throw new Error(`[@zhuangtai-js/persist] Failed to decode the stored value for key "${key}".`, {
      cause: error,
    });
  }
}

type PersistAtomParams<Value> = {
  readonly state: Atom<Value>;
  readonly storage: PersistStorage;
  readonly codec: PersistCodec;
  readonly key: string;
};

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

function persistAtom<Value>({ state, storage, codec, key }: PersistAtomParams<Value>): Atom<Value> {
  function set(nextValue: NextValue<Value>): void {
    const prevValue = state.get();
    const value = isUpdater(nextValue) ? nextValue(prevValue) : nextValue;

    if (Object.is(value, prevValue)) {
      return;
    }

    // Persist first: if encode or setItem throws, in-memory state stays unchanged.
    storage.setItem(key, codec.encode(value));

    // Commit only after a successful write. A concrete value is passed, so core never
    // treats it as an updater.
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
      "[@zhuangtai-js/persist] Reading globalThis.localStorage threw. Pass an explicit storage option instead.",
      { cause: error },
    );
  }

  if (localStorage === undefined) {
    throw new Error(
      "[@zhuangtai-js/persist] No persist storage was provided, and globalThis.localStorage is unavailable.",
    );
  }

  return localStorage;
}

const jsonCodec: PersistCodec = {
  encode(value) {
    const encodedValue = JSON.stringify(value);

    if (typeof encodedValue !== "string") {
      throw new TypeError(
        "The default persist JSON codec can only encode JSON-serializable values.",
      );
    }

    return encodedValue;
  },
  decode(rawValue) {
    return JSON.parse(rawValue);
  },
};
