import type { Atom, NextValue, ReadableAtom } from "@zhuangtai-js/core";
import { useSyncExternalStore } from "preact/compat";
import { useCallback, useMemo } from "preact/hooks";

type ExternalStore<Value> = {
  readonly getSnapshot: () => Value;
  readonly subscribe: (onStoreChange: () => void) => () => void;
};

function createExternalStore<Value>(atom: ReadableAtom<Value>): ExternalStore<Value> {
  let snapshot = atom.get();

  function subscribe(onStoreChange: () => void): () => void {
    let isInitialNotification = true;

    return atom.watch((value) => {
      const previousSnapshot = snapshot;
      snapshot = value;

      if (isInitialNotification) {
        isInitialNotification = false;

        // Core calls watchers synchronously during subscription. Suppress that
        // callback unless it reveals a change between render and subscribe.
        if (!Object.is(value, previousSnapshot)) {
          onStoreChange();
        }

        return;
      }

      onStoreChange();
    });
  }

  function getSnapshot(): Value {
    return snapshot;
  }

  return { getSnapshot, subscribe };
}

/**
 * Subscribe to a readable atom and return its current value.
 *
 * Preact's compatibility hook accepts two arguments, so the same browser-independent snapshot
 * reader is also used during server rendering. Snapshots are cached between core notifications to
 * support computed values that create a fresh object or array on every read.
 */
export function useAtomValue<Value>(atom: ReadableAtom<Value>): Value {
  const store = useMemo(() => createExternalStore(atom), [atom]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** Return a stable setter for a writable atom without subscribing to its value. */
export function useSetAtom<Value>(atom: Atom<Value>): (nextValue: NextValue<Value>) => void {
  return useCallback((nextValue: NextValue<Value>): void => atom.set(nextValue), [atom]);
}

/** Read and write a writable atom, like `useState`. */
export function useAtom<Value>(
  atom: Atom<Value>,
): readonly [Value, (nextValue: NextValue<Value>) => void] {
  return [useAtomValue(atom), useSetAtom(atom)];
}

/** Create a stable, argument-free hook bound to a writable atom. */
export function createAtomHook<Value>(
  atom: Atom<Value>,
): () => readonly [Value, (nextValue: NextValue<Value>) => void] {
  return function useBoundAtom(): readonly [Value, (nextValue: NextValue<Value>) => void] {
    return useAtom(atom);
  };
}

/** Create a stable, argument-free hook bound to a readable atom. */
export function createComputedHook<Value>(atom: ReadableAtom<Value>): () => Value {
  return function useBoundComputed(): Value {
    return useAtomValue(atom);
  };
}
