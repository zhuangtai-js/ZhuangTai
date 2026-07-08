import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  NextValue,
} from "@zhuangtai-js/core";

export type FreezeOptions = {
  readonly enabled?: boolean;
};

export const freeze: AtomCreatorPlugin<"freeze", FreezeOptions> = {
  id: "freeze",
  create: createFrozenAtom,
};

function createFrozenAtom<Value>(
  context: AtomCreatorPluginContext<Value, FreezeOptions>,
): Atom<Value> {
  if (!shouldFreeze(context.options)) {
    return context.next(context.initialValue);
  }

  // Freeze the same reference before it is committed, so accidental mutation of
  // the initial value throws in strict mode instead of silently succeeding.
  deepFreeze(context.initialValue);
  const state = context.next(context.initialValue);

  return freezeAtom(state);
}

function shouldFreeze(options: FreezeOptions | undefined): boolean {
  if (options?.enabled !== undefined) {
    return options.enabled;
  }

  return !isProduction();
}

function isProduction(): boolean {
  // Read process.env.NODE_ENV without depending on @types/node, keeping this
  // plugin free of Node type definitions like core. In non-Node environments
  // process is absent and freezing stays enabled.
  const runtimeProcess = Reflect.get(globalThis, "process");

  if (typeof runtimeProcess !== "object" || runtimeProcess === null) {
    return false;
  }

  const env = Reflect.get(runtimeProcess, "env");

  if (typeof env !== "object" || env === null) {
    return false;
  }

  return Reflect.get(env, "NODE_ENV") === "production";
}

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

function freezeAtom<Value>(state: Atom<Value>): Atom<Value> {
  function set(nextValue: NextValue<Value>): void {
    // Resolve the updater against the current value ourselves so a concrete,
    // already-frozen value reaches the underlying state (core never treats it
    // as an updater), and any later mutation of it throws.
    const value = isUpdater(nextValue) ? nextValue(state.get()) : nextValue;
    deepFreeze(value);
    state.set(value);
  }

  return { get: state.get, set, watch: state.watch };
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" && typeof value !== "function") {
    return;
  }

  if (value === null) {
    return;
  }

  // Freeze before recursing so cyclic references terminate at the isFrozen guard.
  if (Object.isFrozen(value)) {
    return;
  }

  Object.freeze(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key));
  }
}
