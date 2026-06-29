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
    storedValue === null ? context.initialValue : codec.decode(storedValue, context.initialValue);
  const state = context.next(initialValue);

  return persistAtom({ state, storage, codec, key: options.key });
}

type PersistAtomParams<Value> = {
  readonly state: Atom<Value>;
  readonly storage: PersistStorage;
  readonly codec: PersistCodec;
  readonly key: string;
};

function persistAtom<Value>({ state, storage, codec, key }: PersistAtomParams<Value>): Atom<Value> {
  function set(nextValue: NextValue<Value>): void {
    const prevValue = state.get();
    state.set(nextValue);
    const value = state.get();

    if (Object.is(value, prevValue)) {
      return;
    }

    storage.setItem(key, codec.encode(value));
  }

  return { get: state.get, set, watch: state.watch };
}

function resolveStorage(storage: PersistStorage | undefined): PersistStorage {
  if (storage !== undefined) {
    return storage;
  }

  const localStorage = globalThis.localStorage;

  if (localStorage === undefined) {
    throw new Error("No persist storage was provided, and globalThis.localStorage is unavailable.");
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
