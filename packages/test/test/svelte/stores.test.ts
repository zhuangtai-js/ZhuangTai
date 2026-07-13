import { atom, computed } from "@zhuangtai-js/core";
import type { ReadableAtom } from "@zhuangtai-js/core";
import { toReadable, toWritable } from "@zhuangtai-js/svelte";
import { derived, get, readonly } from "svelte/store";
import { describe, expect, it, vi } from "vitest";

describe("toReadable", () => {
  it("subscribes through core watch and emits the current value exactly once", () => {
    const source = atom(1);
    let watchCalls = 0;
    const watchOnlySource: ReadableAtom<number> = {
      get() {
        throw new Error("subscribe must not read with get");
      },
      watch(watcher) {
        watchCalls += 1;
        return source.watch(watcher);
      },
    };
    const values: number[] = [];

    const stop = toReadable(watchOnlySource).subscribe((value) => values.push(value));

    expect(watchCalls).toBe(1);
    expect(values).toEqual([1]);

    source.set(2);
    expect(values).toEqual([1, 2]);

    stop();
    source.set(3);
    expect(values).toEqual([1, 2]);
  });

  it("calls the optional invalidator before every later subscriber run", () => {
    const source = atom(0);
    const events: string[] = [];

    toReadable(source).subscribe(
      (value) => events.push(`run:${value}`),
      () => events.push("invalidate"),
    );

    expect(events).toEqual(["run:0"]);

    source.set(1);
    source.set(2);

    expect(events).toEqual(["run:0", "invalidate", "run:1", "invalidate", "run:2"]);
  });

  it("preserves core Object.is equality", () => {
    const source = atom(Number.NaN);
    const values: number[] = [];

    toReadable(source).subscribe((value) => values.push(value));

    source.set(Number.NaN);
    source.set(0);
    source.set(-0);

    expect(values).toHaveLength(3);
    expect(Number.isNaN(values[0])).toBe(true);
    expect(Object.is(values[1], 0)).toBe(true);
    expect(Object.is(values[2], -0)).toBe(true);
  });

  it("propagates an immediate subscriber error and leaves no subscription behind", () => {
    const source = atom(0);
    const error = new Error("subscriber failed");

    expect(() =>
      toReadable(source).subscribe(() => {
        throw error;
      }),
    ).toThrow(error);

    expect(() => source.set(1)).not.toThrow();
  });
});

describe("toWritable", () => {
  it("sets concrete values and updates from the latest core value", () => {
    const source = atom(1);
    const store = toWritable(source);

    store.set(2);
    source.set(10);
    store.update((value) => value + 5);

    expect(source.get()).toBe(15);
    expect(get(store)).toBe(15);
  });

  it("preserves core reentrant-write errors without running the updater", () => {
    const source = atom(0);
    const store = toWritable(source);
    const updater = vi.fn<(value: number) => number>((value) => value + 1);

    expect(() =>
      store.subscribe(() => {
        store.update(updater);
      }),
    ).toThrow("Cannot call set() on an atom while it is running watcher callbacks");

    expect(updater).not.toHaveBeenCalled();
    expect(source.get()).toBe(0);
  });
});

describe("Svelte store interoperability", () => {
  it("works with get, derived, and readonly from svelte/store", () => {
    const left = atom(1);
    const right = atom(2);
    const sum = derived(
      [toReadable(left), toReadable(right)],
      ([leftValue, rightValue]) => leftValue + rightValue,
    );
    const values: number[] = [];
    const stop = sum.subscribe((value) => values.push(value));

    expect(get(toReadable(computed(() => left.get() * 2)))).toBe(2);
    expect(get(readonly(toWritable(left)))).toBe(1);
    expect(values).toEqual([3]);

    left.set(4);
    right.set(5);

    expect(values).toEqual([3, 6, 9]);

    stop();
    left.set(10);
    expect(values).toEqual([3, 6, 9]);
  });
});
