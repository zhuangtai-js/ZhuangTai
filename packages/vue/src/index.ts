import type { Atom, NextValue, ReadableAtom } from "@zhuangtai-js/core";
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  inject,
  onScopeDispose,
  shallowRef,
  ssrContextKey,
} from "vue";
import type { ComputedRef } from "vue";

function isServerRendering(): boolean {
  return getCurrentInstance() !== null && inject(ssrContextKey, null) !== null;
}

class MissingEffectScopeError extends Error {
  constructor() {
    super("[@zhuangtai-js/vue] useAtomValue() must be called inside an active Vue effect scope.");
    this.name = "MissingEffectScopeError";
  }
}

/**
 * Read a readable atom as a read-only computed ref.
 *
 * Client-side component and effect-scope usage keeps an identity-preserving shallow snapshot and
 * subscribes to core until the current scope is disposed. Vue SSR component setup is read-only: it
 * reads `atom.get()` without creating a core subscription because `renderToString` does not dispose
 * the component effect scope after rendering.
 */
export function useAtomValue<Value>(atom: ReadableAtom<Value>): ComputedRef<Value> {
  if (isServerRendering()) {
    return computed(() => atom.get());
  }

  if (getCurrentScope() === undefined) {
    throw new MissingEffectScopeError();
  }

  const snapshot = shallowRef(atom.get());
  const stopWatch = atom.watch((value) => {
    snapshot.value = value;
  });

  onScopeDispose(stopWatch);

  return computed(() => snapshot.value);
}

/**
 * Return a setter for a writable atom without reading or subscribing to it.
 *
 * This function does not require an active Vue effect scope.
 */
export function useSetAtom<Value>(atom: Atom<Value>): (nextValue: NextValue<Value>) => void {
  return (nextValue: NextValue<Value>): void => atom.set(nextValue);
}

/**
 * Return a read-only computed ref and a setter for a writable atom.
 *
 * Client-side value subscriptions require an active Vue effect scope; Vue SSR component setup uses
 * the read-only path, while the setter delegates directly to core and supports both concrete values
 * and updater functions.
 */
export function useAtom<Value>(
  atom: Atom<Value>,
): readonly [ComputedRef<Value>, (nextValue: NextValue<Value>) => void] {
  return [useAtomValue(atom), useSetAtom(atom)];
}
