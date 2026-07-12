import type { Atom, NextValue, ReadableAtom } from "@zhuangtai-js/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Subscribe to a readable atom (an `Atom` or a `computed`) and re-render on change.
 *
 * Bridges core's synchronous `watch`/`get` to React via `useSyncExternalStore`. Core is fully
 * synchronous, so `get()` always returns the latest value and there is no tearing. The same reader
 * is passed as React's server snapshot; framework-level hydration and request isolation remain
 * application responsibilities.
 */
export function useAtomValue<Value>(atom: ReadableAtom<Value>): Value {
  const store = useMemo(() => {
    let snapshot = atom.get();

    function subscribe(onStoreChange: () => void): () => void {
      // Core invokes watch() once synchronously on subscribe. Use that value to
      // close the render-to-subscribe gap, but let React's post-subscribe
      // snapshot check detect it instead of notifying during subscription.
      let initialized = false;

      return atom.watch((value) => {
        snapshot = value;

        if (!initialized) {
          initialized = true;
          return;
        }

        onStoreChange();
      });
    }

    function getSnapshot(): Value {
      return snapshot;
    }

    return { getSnapshot, subscribe };
  }, [atom]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
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
