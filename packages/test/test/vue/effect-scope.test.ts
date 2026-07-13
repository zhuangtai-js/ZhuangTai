import { atom, computed as coreComputed } from "@zhuangtai-js/core";
import type { ReadableAtom } from "@zhuangtai-js/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope, isProxy, isReadonly, isRef, watch, type EffectScope } from "vue";
import { useAtom, useAtomValue, useSetAtom } from "../../../vue/src/index.ts";

function runInScope<Value>(scope: EffectScope, callback: () => Value): Value {
  const result = scope.run(callback);
  if (result === undefined) {
    throw new Error("Expected the Vue effect scope to be active.");
  }

  return result;
}

describe("Vue adapter effect scopes", () => {
  it("preserves exact object identity with a shallow read-only computed snapshot", () => {
    const initialValue = { count: 1 };
    const nextValue = { count: 2 };
    const source = atom(initialValue);
    const scope = effectScope();
    const snapshot = runInScope(scope, () => useAtomValue(source));

    expect(isRef(snapshot)).toBe(true);
    expect(isReadonly(snapshot)).toBe(true);
    expect(snapshot.value).toBe(initialValue);
    expect(isProxy(snapshot.value)).toBe(false);

    source.set(nextValue);

    expect(snapshot.value).toBe(nextValue);
    expect(isProxy(snapshot.value)).toBe(false);

    scope.stop();
  });

  it("updates writable and core-computed values synchronously", () => {
    const count = atom(1);
    const double = coreComputed(() => count.get() * 2);
    const scope = effectScope();
    const scopedValues = runInScope(scope, () => {
      const [countSnapshot, setCount] = useAtom(count);

      return {
        countSnapshot,
        doubleSnapshot: useAtomValue(double),
        setCount,
      };
    });

    expect(scopedValues.countSnapshot.value).toBe(1);
    expect(scopedValues.doubleSnapshot.value).toBe(2);

    scopedValues.setCount((value) => value + 1);

    expect(scopedValues.countSnapshot.value).toBe(2);
    expect(scopedValues.doubleSnapshot.value).toBe(4);

    scope.stop();
  });

  it("cleans up the core watcher when the effect scope stops", () => {
    let value = 1;
    const watchers = new Set<(nextValue: number, previousValue: number | undefined) => void>();
    const source: ReadableAtom<number> = {
      get: () => value,
      watch(watcher) {
        watchers.add(watcher);
        watcher(value, undefined);

        return () => watchers.delete(watcher);
      },
    };
    const scope = effectScope();
    const snapshot = runInScope(scope, () => useAtomValue(source));

    expect(watchers.size).toBe(1);
    expect(snapshot.value).toBe(1);

    scope.stop();
    expect(watchers.size).toBe(0);

    value = 2;
    for (const watcher of watchers) {
      watcher(value, 1);
    }

    expect(snapshot.value).toBe(1);
  });

  it("preserves Object.is behavior for NaN and signed zero", () => {
    const source = atom(Number.NaN);
    const scope = effectScope();
    const observed: number[] = [];
    const snapshot = runInScope(scope, () => {
      const nextSnapshot = useAtomValue(source);
      watch(nextSnapshot, (value) => observed.push(value), { flush: "sync" });

      return nextSnapshot;
    });

    source.set(Number.NaN);
    expect(observed).toEqual([]);

    source.set(0);
    expect(observed).toHaveLength(1);
    expect(Object.is(observed[0], 0)).toBe(true);

    source.set(-0);
    expect(observed).toHaveLength(2);
    expect(Object.is(observed[1], -0)).toBe(true);
    expect(Object.is(snapshot.value, -0)).toBe(true);

    scope.stop();
  });

  it("allows setter-only usage outside an effect scope", () => {
    const source = atom(1);
    const setValue = useSetAtom(source);

    setValue(2);
    setValue((value) => value + 3);

    expect(source.get()).toBe(5);
  });

  it("throws before reading or subscribing when no effect scope is active", () => {
    const get = vi.fn<() => number>(() => 1);
    const watchSource = vi.fn<ReadableAtom<number>["watch"]>(() => () => undefined);
    const source: ReadableAtom<number> = { get, watch: watchSource };

    expect(() => useAtomValue(source)).toThrow(
      "[@zhuangtai-js/vue] useAtomValue() must be called inside an active Vue effect scope.",
    );
    expect(get).not.toHaveBeenCalled();
    expect(watchSource).not.toHaveBeenCalled();
  });

  it("propagates subscription and watcher errors without replacing them", () => {
    const subscribeError = new TypeError("subscribe failed");
    const brokenSource: ReadableAtom<number> = {
      get: () => 1,
      watch() {
        throw subscribeError;
      },
    };
    const brokenScope = effectScope();

    expect(() => brokenScope.run(() => useAtomValue(brokenSource))).toThrow(subscribeError);
    brokenScope.stop();

    const source = atom(0);
    const scope = effectScope();
    const snapshot = runInScope(scope, () => useAtomValue(source));

    const watcherError = new RangeError("watcher failed");
    const stopFailingWatcher = source.watch((_value, previousValue) => {
      if (previousValue !== undefined) {
        throw watcherError;
      }
    });

    expect(() => source.set(1)).toThrow(watcherError);
    expect(snapshot.value).toBe(1);

    stopFailingWatcher();
    scope.stop();
  });
});
