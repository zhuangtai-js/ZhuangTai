import type {
  Atom,
  AtomCreator,
  AtomCreatorPlugin,
  AtomCreatorOptions,
  NextValue,
  Watcher,
} from "./types.js";

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

export function atom<Value>(initialValue: Value): Atom<Value> {
  let currentValue = initialValue;
  let notificationDepth = 0;
  const watchers = new Set<Watcher<Value>>();

  function get(): Value {
    return currentValue;
  }

  function set(nextValue: NextValue<Value>): void {
    if (notificationDepth > 0) {
      throw new Error(
        "[@zhuangtai-js/core] Cannot call set() on an atom while it is notifying watchers.",
      );
    }

    const value = isUpdater(nextValue) ? nextValue(currentValue) : nextValue;

    if (Object.is(value, currentValue)) {
      return;
    }

    const prevValue = currentValue;
    currentValue = value;

    notificationDepth += 1;

    try {
      for (const watcher of Array.from(watchers)) {
        watcher(currentValue, prevValue);
      }
    } finally {
      notificationDepth -= 1;
    }
  }

  function watch(watcher: Watcher<Value>): () => void {
    watchers.add(watcher);
    notificationDepth += 1;

    try {
      watcher(currentValue, undefined);
    } finally {
      notificationDepth -= 1;
    }

    return () => {
      watchers.delete(watcher);
    };
  }

  return { get, set, watch };
}

export function createAtom(): AtomCreator {
  return createAtomWithFactory(atom, new Set());
}

type AtomFactory<OptionsByPlugin extends Record<string, object>> = <Value>(
  initialValue: Value,
  options?: AtomCreatorOptions<OptionsByPlugin>,
) => Atom<Value>;

function createAtomWithFactory<OptionsByPlugin extends Record<string, object>>(
  factory: AtomFactory<OptionsByPlugin>,
  installedPluginIds: ReadonlySet<string>,
): AtomCreator<OptionsByPlugin> {
  function createState<Value>(
    initialValue: Value,
    options?: AtomCreatorOptions<OptionsByPlugin>,
  ): Atom<Value> {
    return factory(initialValue, options);
  }

  createState.use = function use<Name extends string, Options extends object>(
    plugin: AtomCreatorPlugin<Name, Options>,
  ): AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }> {
    if (installedPluginIds.has(plugin.id)) {
      return createAtomWithFactory<OptionsByPlugin & { readonly [Key in Name]: Options }>(
        factory,
        installedPluginIds,
      );
    }

    function nextFactory<Value>(
      initialValue: Value,
      options?: AtomCreatorOptions<OptionsByPlugin & { readonly [Key in Name]: Options }>,
    ): Atom<Value> {
      return plugin.create({
        initialValue,
        options: options?.[plugin.id],
        next(nextInitialValue) {
          return factory(nextInitialValue, options);
        },
      });
    }

    return createAtomWithFactory(nextFactory, new Set([...installedPluginIds, plugin.id]));
  };

  return createState;
}
