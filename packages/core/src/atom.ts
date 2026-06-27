import type { Atom, NextValue, Watcher } from "./types.js";

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

export function atom<Value>(initialValue: Value): Atom<Value> {
  let currentValue = initialValue;
  const watchers = new Set<Watcher<Value>>();

  function get(): Value {
    return currentValue;
  }

  function set(nextValue: NextValue<Value>): void {
    const value = isUpdater(nextValue) ? nextValue(currentValue) : nextValue;

    if (Object.is(value, currentValue)) {
      return;
    }

    const prevValue = currentValue;
    currentValue = value;

    for (const watcher of Array.from(watchers)) {
      watcher(currentValue, prevValue);
    }
  }

  function watch(watcher: Watcher<Value>): () => void {
    watchers.add(watcher);
    watcher(currentValue, undefined);

    return () => {
      watchers.delete(watcher);
    };
  }

  return { get, set, watch };
}
