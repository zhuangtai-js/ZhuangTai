import type { Atom, ReadableAtom } from "@zhuangtai-js/core";
import type { Readable, Writable } from "svelte/store";

export function toReadable<Value>(source: ReadableAtom<Value>): Readable<Value> {
  return {
    subscribe(run, invalidate) {
      let isInitialRun = true;

      return source.watch((value) => {
        if (isInitialRun) {
          isInitialRun = false;
        } else {
          invalidate?.();
        }

        run(value);
      });
    },
  };
}

export function toWritable<Value>(source: Atom<Value>): Writable<Value> {
  const readable = toReadable(source);

  return {
    subscribe: readable.subscribe,
    set(value) {
      source.set(value);
    },
    update(updater) {
      source.set(updater);
    },
  };
}
