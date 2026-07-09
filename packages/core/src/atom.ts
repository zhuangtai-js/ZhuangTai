import type {
  Atom,
  AtomCreator,
  AtomCreatorPlugin,
  AtomCreatorOptions,
  AtomKind,
  NextValue,
  RejectFunctionValue,
  Watcher,
} from "./types.js";
import { trackDependency } from "./tracking.js";

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

function createAtomState<Value>(initialValue: Value): Atom<Value> {
  let currentValue = initialValue;
  let callbackDepth = 0;
  const watchers = new Set<Watcher<Value>>();

  function get(): Value {
    trackDependency(self);
    return currentValue;
  }

  function set(nextValue: NextValue<Value>): void {
    if (callbackDepth > 0) {
      throw new Error(
        "[@zhuangtai-js/core] Cannot call set() on an atom while it is running watcher callbacks.",
      );
    }

    const value = isUpdater(nextValue) ? nextValue(currentValue) : nextValue;

    if (Object.is(value, currentValue)) {
      return;
    }

    const prevValue = currentValue;
    currentValue = value;

    callbackDepth += 1;
    const errors: unknown[] = [];

    try {
      for (const watcher of Array.from(watchers)) {
        try {
          watcher(currentValue, prevValue);
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      callbackDepth -= 1;
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "[@zhuangtai-js/core] One or more atom watchers threw.");
    }
  }

  function watch(watcher: Watcher<Value>): () => void {
    watchers.add(watcher);
    callbackDepth += 1;

    try {
      watcher(currentValue, undefined);
    } catch (error) {
      watchers.delete(watcher);
      throw error;
    } finally {
      callbackDepth -= 1;
    }

    return () => {
      watchers.delete(watcher);
    };
  }

  const self: Atom<Value> = { get, set, watch };

  return self;
}

export function atom<Value>(initialValue: RejectFunctionValue<Value>): Atom<Value> {
  // RejectFunctionValue<Value> narrows the public parameter to reject function types while
  // preserving literal widening; internally it is structurally the plain Value.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the guard is a public-surface constraint only; the value is exactly Value at runtime.
  return createAtomState<Value>(initialValue as Value);
}

export function createAtom(): AtomCreator {
  return createAtomWithFactory(createAtomState, new Set());
}

type AtomFactory<OptionsByPlugin extends Record<string, object>> = <Value>(
  initialValue: Value,
  options?: AtomCreatorOptions<OptionsByPlugin>,
) => Atom<Value>;

function createAtomWithFactory<
  OptionsByPlugin extends Record<string, object>,
  Kind extends AtomKind = "default",
>(
  factory: AtomFactory<OptionsByPlugin>,
  installedPluginIds: ReadonlySet<string>,
): AtomCreator<OptionsByPlugin, Kind> {
  function createState<Value>(
    initialValue: Value,
    options?: AtomCreatorOptions<OptionsByPlugin>,
  ): Atom<Value> {
    return factory(initialValue, options);
  }

  createState.use = function use<
    Name extends string,
    Options extends object,
    PluginKind extends AtomKind = "default",
  >(
    plugin: AtomCreatorPlugin<Name, Options, PluginKind>,
  ): AtomCreator<
    OptionsByPlugin & { readonly [Key in Name]: Options },
    PluginKind extends "default" ? Kind : PluginKind
  > {
    type NextOptions = OptionsByPlugin & { readonly [Key in Name]: Options };
    type NextKind = PluginKind extends "default" ? Kind : PluginKind;

    if (installedPluginIds.has(plugin.id)) {
      return createAtomWithFactory<NextOptions, NextKind>(factory, installedPluginIds);
    }

    function nextFactory<Value>(
      initialValue: Value,
      options?: AtomCreatorOptions<NextOptions>,
    ): Atom<Value> {
      return plugin.create({
        initialValue,
        options: options?.[plugin.id],
        next(nextInitialValue) {
          return factory(nextInitialValue, options);
        },
      });
    }

    return createAtomWithFactory<NextOptions, NextKind>(
      nextFactory,
      new Set([...installedPluginIds, plugin.id]),
    );
  };

  // createState is plain-`Value` internally; AtomCreator's public call signature adds the
  // RejectFunctionValue guard. Atom<Value> is invariant, so the guarded interface is not
  // structurally inferable from the plain impl even though every call is sound. Assert at
  // this single boundary rather than leaking the guard into internal inference.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- single-boundary assertion for the invariant Atom<Value>; every call is sound (see comment above).
  return createState as AtomCreator<OptionsByPlugin, Kind>;
}
