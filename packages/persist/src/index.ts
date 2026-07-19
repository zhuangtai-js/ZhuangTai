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
  encodeVersioned,
  planUnversionedRestore,
  planVersionedRestore,
  type RestorePlan,
} from "./versioned-plan.js";
import { assertPersistVersion, readVersioned, writeEncodedVersioned } from "./versioned.js";

export { definePersistMigration } from "./types.js";
export type {
  MaybePromise,
  PersistCodec,
  PersistControls,
  PersistMigration,
  PersistOptions,
  PersistStorage,
} from "./types.js";

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
  readonly read: () => MaybePromise<string | null>;
  readonly restore: (rawValue: string) => RestorePlan<Value>;
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
  const storedValue = plan.read();

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
  const restorePlan = plan.restore(storedValue);
  if (restorePlan.kind === "value") {
    const state = context.next(restorePlan.value);
    const controller = createController({ state, options, storage, plan });
    registerPersistController(controller.atom, controller);
    return controller.atom;
  }
  const writeBack = plan.write(restorePlan.writeBack);
  if (!isPromiseLike(writeBack)) {
    const state = context.next(restorePlan.finalize());
    const controller = createController({ state, options, storage, plan });
    registerPersistController(controller.atom, controller);
    return controller.atom;
  }
  const state = context.next(context.initialValue);
  const controller = createController({ state, options, storage, plan });
  registerPersistController(controller.atom, controller);
  controller.startInitialMigration(restorePlan, writeBack);
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
    read: plan.read,
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
      read() {
        return storage.getItem(options.key);
      },
      restore(rawValue) {
        return planUnversionedRestore(codec, rawValue, initialValue, options.key);
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
    read() {
      return readVersioned(storage, options.key, version);
    },
    restore(rawValue) {
      return planVersionedRestore({
        rawValue,
        initialValue,
        key: options.key,
        version,
        migrations: options.migrations,
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
