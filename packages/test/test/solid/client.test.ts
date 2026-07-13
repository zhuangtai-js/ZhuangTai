import { atom, computed } from "@zhuangtai-js/core";
import type { ReadableAtom, StopWatch, Watcher } from "@zhuangtai-js/core";
import { createEffect, createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { createAtomSignal, createAtomValue, createSetAtom } from "../../../solid/src/index.ts";

type ValueObject = {
  readonly count: number;
};

type FunctionValue = (value: string) => string;

function identityFunction(value: string): string {
  return value;
}

function uppercaseFunction(value: string): string {
  return value.toUpperCase();
}

describe("Solid adapter owned signals", () => {
  it("tracks core values in effects and removes the watcher when the root is disposed", () => {
    let currentValue = 1;
    const watchers = new Set<Watcher<number>>();
    const source: ReadableAtom<number> = {
      get: () => currentValue,
      watch: (watcher: Watcher<number>): StopWatch => {
        watchers.add(watcher);
        watcher(currentValue, undefined);

        return () => {
          watchers.delete(watcher);
        };
      },
    };
    const observed: number[] = [];
    const owned = createRoot((dispose) => {
      const value = createAtomValue(source);
      createEffect(() => observed.push(value()));

      return { dispose, value };
    });

    expect(owned.value()).toBe(1);
    expect(observed).toEqual([1]);
    expect(watchers.size).toBe(1);

    const previousValue = currentValue;
    currentValue = 2;
    for (const watcher of watchers) {
      watcher(currentValue, previousValue);
    }

    expect(owned.value()).toBe(2);
    expect(observed).toEqual([1, 2]);

    owned.dispose();
    expect(watchers.size).toBe(0);
  });

  it("closes the read-to-subscribe gap with the initial synchronous notification", () => {
    let currentValue = 1;
    let activeWatchers = 0;
    const source: ReadableAtom<number> = {
      get: () => currentValue,
      watch: (watcher: Watcher<number>): StopWatch => {
        activeWatchers += 1;
        const previousValue = currentValue;
        currentValue = 2;
        watcher(currentValue, previousValue);

        return () => {
          activeWatchers -= 1;
        };
      },
    };
    const owned = createRoot((dispose) => ({
      dispose,
      value: createAtomValue(source),
    }));

    expect(owned.value()).toBe(2);
    expect(activeWatchers).toBe(1);

    owned.dispose();
    expect(activeWatchers).toBe(0);
  });

  it("preserves object and function identity", () => {
    const initialObject: ValueObject = { count: 1 };
    const nextObject: ValueObject = { count: 2 };
    const objectSource = atom(initialObject);
    const initialFunction: FunctionValue = identityFunction;
    const nextFunction: FunctionValue = uppercaseFunction;
    let currentFunction = initialFunction;
    const functionWatchers = new Set<Watcher<FunctionValue>>();
    const functionSource: ReadableAtom<FunctionValue> = {
      get: () => currentFunction,
      watch: (watcher: Watcher<FunctionValue>): StopWatch => {
        functionWatchers.add(watcher);
        watcher(currentFunction, undefined);

        return () => {
          functionWatchers.delete(watcher);
        };
      },
    };
    const owned = createRoot((dispose) => ({
      dispose,
      functionValue: createAtomValue(functionSource),
      objectValue: createAtomValue(objectSource),
    }));

    expect(owned.objectValue()).toBe(initialObject);
    expect(owned.functionValue()).toBe(initialFunction);

    objectSource.set(nextObject);
    const previousFunction = currentFunction;
    currentFunction = nextFunction;
    for (const watcher of functionWatchers) {
      watcher(currentFunction, previousFunction);
    }

    expect(owned.objectValue()).toBe(nextObject);
    expect(owned.functionValue()).toBe(nextFunction);

    owned.dispose();
  });

  it("bridges writable atoms and core computed values synchronously", () => {
    const count = atom(2);
    const double = computed(() => count.get() * 2);
    const owned = createRoot((dispose) => {
      const [countValue, setCount] = createAtomSignal(count);
      const doubleValue = createAtomValue(double);

      return { countValue, dispose, doubleValue, setCount };
    });

    expect(owned.countValue()).toBe(2);
    expect(owned.doubleValue()).toBe(4);

    owned.setCount((value) => value + 3);

    expect(owned.countValue()).toBe(5);
    expect(owned.doubleValue()).toBe(10);

    owned.dispose();
  });

  it("keeps core as the equality gate for NaN and signed zero", () => {
    const source = atom(Number.NaN);
    const observed: number[] = [];
    const owned = createRoot((dispose) => {
      const value = createAtomValue(source);
      createEffect(() => observed.push(value()));

      return { dispose, value };
    });

    expect(observed).toHaveLength(1);
    expect(observed[0]).toBeNaN();

    source.set(Number.NaN);
    expect(observed).toHaveLength(1);

    source.set(0);
    expect(observed).toHaveLength(2);
    expect(Object.is(observed[1], 0)).toBe(true);

    source.set(-0);
    expect(observed).toHaveLength(3);
    expect(Object.is(observed[2], -0)).toBe(true);
    expect(Object.is(owned.value(), -0)).toBe(true);

    owned.dispose();
  });

  it("allows setter-only usage without an owner", () => {
    const source = atom(1);
    const setValue = createSetAtom(source);

    setValue(2);
    setValue((value) => value + 3);

    expect(source.get()).toBe(5);
  });

  it("throws before reading or subscribing when no owner is active", () => {
    const get = vi.fn<() => number>(() => 1);
    const watch = vi.fn<(watcher: Watcher<number>) => StopWatch>(
      (_watcher: Watcher<number>): StopWatch =>
        () =>
          undefined,
    );
    const source: ReadableAtom<number> = { get, watch };

    expect(() => createAtomValue(source)).toThrow(
      "[@zhuangtai-js/solid] createAtomValue() must be called inside a Solid owner.",
    );
    expect(get).not.toHaveBeenCalled();
    expect(watch).not.toHaveBeenCalled();
  });

  it("propagates subscription and watcher errors without replacing them", () => {
    const subscribeError = new TypeError("subscribe failed");
    const brokenSource: ReadableAtom<number> = {
      get: () => 1,
      watch: (): StopWatch => {
        throw subscribeError;
      },
    };

    expect(() => createRoot(() => createAtomValue(brokenSource))).toThrow(subscribeError);

    const source = atom(0);
    const owned = createRoot((dispose) => ({
      dispose,
      value: createAtomValue(source),
    }));
    const watcherError = new RangeError("watcher failed");
    const stopFailingWatcher = source.watch((_value, previousValue) => {
      if (previousValue !== undefined) {
        throw watcherError;
      }
    });

    expect(() => source.set(1)).toThrow(watcherError);
    expect(owned.value()).toBe(1);

    stopFailingWatcher();
    owned.dispose();
  });
});
