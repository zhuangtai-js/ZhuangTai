import type { Atom, NextValue, ReadableAtom } from "@zhuangtai-js/core";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a readable atom (an `Atom` or a `computed`) and re-render on change.
 *
 * Bridges core's synchronous `watch`/`get` to React via `useSyncExternalStore`. Core is fully
 * synchronous, so `get()` always returns the latest value and there is no tearing; the same reader
 * is used as the server snapshot.
 */
export function useAtomValue<Value>(atom: ReadableAtom<Value>): Value {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      // core's watch() invokes the watcher once synchronously with
      // (currentValue, undefined) on subscribe. Skip that initial call; React
      // already has the current snapshot, so only real changes should notify.
      let initialized = false;

      return atom.watch(() => {
        if (!initialized) {
          initialized = true;
          return;
        }

        onStoreChange();
      });
    },
    [atom],
  );

  const getSnapshot = useCallback((): Value => atom.get(), [atom]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Return a stable setter for a writable atom without subscribing to its value.
 *
 * Components using only the setter do not re-render when the atom changes.
 */
export function useSetAtom<Value>(atom: Atom<Value>): (nextValue: NextValue<Value>) => void {
  return useCallback((nextValue: NextValue<Value>): void => atom.set(nextValue), [atom]);
}

/**
 * Read and write a writable atom, like `useState`.
 *
 * Returns the current value and a stable setter. The component re-renders when the atom changes.
 */
export function useAtom<Value>(
  atom: Atom<Value>,
): readonly [Value, (nextValue: NextValue<Value>) => void] {
  return [useAtomValue(atom), useSetAtom(atom)];
}

/**
 * Create a zustand-style hook bound to a writable atom.
 *
 * The returned hook takes no arguments and returns `[value, setter]`, like `useState`. Pair it with
 * `atom(...)` from core, mirroring the writable half of the core `atom` / `computed` split.
 */
export function createAtomHook<Value>(
  atom: Atom<Value>,
): () => readonly [Value, (nextValue: NextValue<Value>) => void] {
  return function useBoundAtom(): readonly [Value, (nextValue: NextValue<Value>) => void] {
    return useAtom(atom);
  };
}

/**
 * Create a zustand-style hook bound to a readable atom (an `Atom` or a `computed`).
 *
 * The returned hook takes no arguments and returns the current value only, with no setter. Pair it
 * with `computed(...)` from core, mirroring the read-only half of the core `atom` / `computed`
 * split.
 */
export function createComputedHook<Value>(atom: ReadableAtom<Value>): () => Value {
  return function useBoundComputed(): Value {
    return useAtomValue(atom);
  };
}
