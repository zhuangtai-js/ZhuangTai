import type { Atom, NextValue, ReadableAtom } from "@zhuangtai-js/core";
import { createSignal, getOwner, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import { isServer } from "solid-js/web";

class MissingOwnerError extends Error {
  constructor() {
    super("[@zhuangtai-js/solid] createAtomValue() must be called inside a Solid owner.");
    this.name = "MissingOwnerError";
  }
}

/**
 * Read a readable atom as a server snapshot or within the current client owner.
 *
 * Client owners subscribe to Core and clean up with their owner. Solid server rendering reads a
 * snapshot without installing a Core watcher.
 */
export function createAtomValue<Value>(source: ReadableAtom<Value>): Accessor<Value> {
  if (isServer) {
    const serverValue = source.get();
    return () => serverValue;
  }

  if (getOwner() === null) {
    throw new MissingOwnerError();
  }

  const initialValue = source.get();

  const [value, setValue] = createSignal(initialValue, { equals: false });
  let isInitialNotification = true;

  const stopWatch = source.watch((nextValue) => {
    if (isInitialNotification) {
      isInitialNotification = false;

      if (Object.is(nextValue, initialValue)) {
        return;
      }
    }

    setValue(() => nextValue);
  });

  onCleanup(stopWatch);

  return value;
}

/** Return a setter for a writable atom without reading or subscribing to it. */
export function createSetAtom<Value>(source: Atom<Value>): (nextValue: NextValue<Value>) => void {
  return (nextValue: NextValue<Value>): void => source.set(nextValue);
}

/** Return a Solid accessor and a setter for a writable atom. */
export function createAtomSignal<Value>(
  source: Atom<Value>,
): readonly [Accessor<Value>, (nextValue: NextValue<Value>) => void] {
  return [createAtomValue(source), createSetAtom(source)];
}
