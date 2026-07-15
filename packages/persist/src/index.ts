import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  ReadableAtom,
} from "@zhuangtai-js/core";
import { AsyncPersistController } from "./async-controller.js";
import { getPersistController, registerPersistController } from "./controller-registry.js";
import { jsonCodec } from "./json-codec.js";
import { isPromiseLike, resolveStorage } from "./storage.js";
import type {
  MaybePromise,
  PersistCodec,
  PersistControls,
  PersistOptions,
  PersistStorage,
} from "./types.js";
import {
  assertPersistVersion,
  encodeVersioned,
  restoreVersioned,
  writeEncodedVersioned,
} from "./versioned.js";

export { definePersistMigration } from "./types.js";
export type {
  MaybePromise,
  PersistCodec,
  PersistControls,
  PersistMigration,
  PersistOptions,
  PersistStorage,
} from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";

export const persist: AtomCreatorPlugin<"persist", PersistOptions> & PersistControls = {
  id: "persist",
  create: createPersistedAtom,
  ready(atom) {
    return controllerFor(atom).ready();
  },
  flush(atom) {
    return controllerFor(atom).flush();
  },
  rehydrate(atom) {
    return controllerFor(atom).rehydrate();
  },
  clear(atom) {
    return controllerFor(atom).clear();
  },
};

function controllerFor(atom: ReadableAtom<unknown>) {
  return getPersistController(atom);
}

type PersistencePlan<Value> = {
  readonly restore: (rawValue: string) => MaybePromise<Value>;
  readonly encode: (value: Value) => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
};

type PersistencePlanParams<Value> = {
  readonly initialValue: Value;
  readonly options: PersistOptions;
  readonly storage: PersistStorage;
  readonly codec: PersistCodec;
};

type ControllerParams<Value> = {
  readonly state: Atom<Value>;
  readonly options: PersistOptions;
  readonly storage: PersistStorage;
  readonly plan: PersistencePlan<Value>;
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
  const plan = createPersistencePlan({
    initialValue: context.initialValue,
    options,
    storage,
    codec,
  });
  const storedValue = storage.getItem(options.key);

  if (isPromiseLike(storedValue)) {
    const hydration = Promise.resolve(storedValue);
    void hydration.then(
      () => undefined,
      () => undefined,
    );
    const state = context.next(context.initialValue);
    const controller = createController({ state, options, storage, plan });
    registerPersistController(controller.atom, controller);
    controller.startInitialHydration(hydration);
    return controller.atom;
  }

  if (storedValue === null) {
    const state = context.next(context.initialValue);
    const controller = createController({ state, options, storage, plan });
    registerPersistController(controller.atom, controller);
    return controller.atom;
  }
  const restoredValue = plan.restore(storedValue);
  if (isPromiseLike(restoredValue)) {
    const state = context.next(context.initialValue);
    const controller = createController({ state, options, storage, plan });
    registerPersistController(controller.atom, controller);
    controller.startInitialValueHydration(restoredValue);
    return controller.atom;
  }
  const state = context.next(restoredValue);
  const controller = createController({ state, options, storage, plan });
  registerPersistController(controller.atom, controller);
  return controller.atom;
}

function createController<Value>({
  state,
  options,
  storage,
  plan,
}: ControllerParams<Value>): AsyncPersistController<Value> {
  return new AsyncPersistController({
    state,
    storage,
    key: options.key,
    restore: plan.restore,
    encode: plan.encode,
    write: plan.write,
    onError: options.onError,
  });
}

function createPersistencePlan<Value>({
  initialValue,
  options,
  storage,
  codec,
}: PersistencePlanParams<Value>): PersistencePlan<Value> {
  if (options.version === undefined) {
    return {
      restore(rawValue) {
        return decodeStored(codec, rawValue, initialValue, options.key);
      },
      encode(value) {
        return codec.encode(value);
      },
      write(encodedValue) {
        return storage.setItem(options.key, encodedValue);
      },
    };
  }

  const version = options.version;
  return {
    restore(rawValue) {
      return restoreVersioned({
        rawValue,
        initialValue,
        key: options.key,
        version,
        migrations: options.migrations,
        storage,
        codec,
      });
    },
    encode(value) {
      return encodeVersioned(codec, value, options.key, version);
    },
    write(encodedValue) {
      return writeEncodedVersioned(storage, options.key, version, encodedValue);
    },
  };
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
